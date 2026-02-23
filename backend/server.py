from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="TaskFlow Pro API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar_color: str
    created_at: str

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class MemberAdd(BaseModel):
    email: str

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    status: str = "todo"
    priority: str = "medium"
    assignee_id: Optional[str] = None
    due_date: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[str] = None

class TaskMove(BaseModel):
    status: str
    order: int

# ============ HELPERS ============

AVATAR_COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#F43F5E", "#8B5CF6", "#06B6D4", "#EC4899", "#14B8A6"]

def get_avatar_color(email: str) -> str:
    return AVATAR_COLORS[hash(email) % len(AVATAR_COLORS)]

def create_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def log_activity(project_id: str, user_id: str, user_name: str, action: str, details: str):
    activity = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "user_id": user_id,
        "user_name": user_name,
        "action": action,
        "details": details,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.activity.insert_one(activity)
    # Notify WebSocket clients
    await broadcast_to_project(project_id, {"type": "activity", "data": activity})

# ============ EMAIL SERVICE (SendGrid) ============

async def send_notification_email(to_email: str, subject: str, content: str):
    """Send email via SendGrid. Falls back to logging if key not configured."""
    sendgrid_key = os.environ.get('SENDGRID_API_KEY', '')
    sender_email = os.environ.get('SENDER_EMAIL', 'noreply@taskflow.pro')
    
    if not sendgrid_key:
        logger.info(f"[MOCKED EMAIL] To: {to_email}, Subject: {subject}")
        return True
    
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        
        message = Mail(
            from_email=sender_email,
            to_emails=to_email,
            subject=subject,
            html_content=f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #4F46E5; padding: 16px 24px; border-radius: 8px 8px 0 0;">
                    <h2 style="color: white; margin: 0; font-size: 18px;">TaskFlow Pro</h2>
                </div>
                <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    {content}
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                    <p style="color: #6b7280; font-size: 12px;">This notification was sent by TaskFlow Pro.</p>
                </div>
            </div>
            """
        )
        
        sg = SendGridAPIClient(sendgrid_key)
        response = sg.send(message)
        logger.info(f"Email sent to {to_email}, status: {response.status_code}")
        return response.status_code == 202
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False

# ============ WEBSOCKET MANAGER ============

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)

    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            self.active_connections[project_id] = [
                ws for ws in self.active_connections[project_id] if ws != websocket
            ]

    async def broadcast(self, project_id: str, message: dict):
        if project_id in self.active_connections:
            dead = []
            for ws in self.active_connections[project_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active_connections[project_id].remove(ws)

manager = ConnectionManager()

async def broadcast_to_project(project_id: str, message: dict):
    await manager.broadcast(project_id, message)

# ============ AUTH ROUTES ============

@api_router.post("/auth/signup")
async def signup(data: UserCreate):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": data.name,
        "email": data.email,
        "password_hash": pwd_context.hash(data.password),
        "avatar_color": get_avatar_color(data.email),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id, data.email)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "name": data.name,
            "email": data.email,
            "avatar_color": user_doc["avatar_color"],
            "created_at": user_doc["created_at"]
        }
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not pwd_context.verify(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "avatar_color": user["avatar_color"],
            "created_at": user["created_at"]
        }
    }

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return user

# ============ PROJECT ROUTES ============

@api_router.post("/projects")
async def create_project(data: ProjectCreate, user=Depends(get_current_user)):
    project_id = str(uuid.uuid4())
    project_doc = {
        "id": project_id,
        "name": data.name,
        "description": data.description or "",
        "owner_id": user["id"],
        "members": [{"id": user["id"], "name": user["name"], "email": user["email"], "avatar_color": user["avatar_color"], "role": "owner"}],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.projects.insert_one(project_doc)
    await log_activity(project_id, user["id"], user["name"], "project_created", f"Created project '{data.name}'")
    
    result = dict(project_doc)
    result.pop("_id", None)
    return result

@api_router.get("/projects")
async def get_projects(user=Depends(get_current_user)):
    projects = await db.projects.find(
        {"members.id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    # Batch task counts using aggregation to avoid N+1 queries
    project_ids = [p["id"] for p in projects]
    if project_ids:
        pipeline = [
            {"$match": {"project_id": {"$in": project_ids}}},
            {"$group": {
                "_id": "$project_id",
                "total": {"$sum": 1},
                "done": {"$sum": {"$cond": [{"$eq": ["$status", "done"]}, 1, 0]}}
            }}
        ]
        counts = {doc["_id"]: doc async for doc in db.tasks.aggregate(pipeline)}
        for project in projects:
            c = counts.get(project["id"], {})
            project["task_count"] = c.get("total", 0)
            project["done_count"] = c.get("done", 0)
    else:
        for project in projects:
            project["task_count"] = 0
            project["done_count"] = 0
    
    return projects

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, user=Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id, "members.id": user["id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, data: ProjectUpdate, user=Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id, "owner_id": user["id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not owner")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.name is not None:
        update_data["name"] = data.name
    if data.description is not None:
        update_data["description"] = data.description
    
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return updated

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user=Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id, "owner_id": user["id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not owner")
    
    await db.projects.delete_one({"id": project_id})
    await db.tasks.delete_many({"project_id": project_id})
    await db.activity.delete_many({"project_id": project_id})
    return {"status": "deleted"}

@api_router.post("/projects/{project_id}/members")
async def add_member(project_id: str, data: MemberAdd, user=Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id, "members.id": user["id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if member already exists
    for member in project.get("members", []):
        if member["email"] == data.email:
            raise HTTPException(status_code=400, detail="Member already in project")
    
    # Find user by email
    new_member = await db.users.find_one({"email": data.email}, {"_id": 0, "password_hash": 0})
    if not new_member:
        raise HTTPException(status_code=404, detail="User not found with that email")
    
    member_data = {
        "id": new_member["id"],
        "name": new_member["name"],
        "email": new_member["email"],
        "avatar_color": new_member["avatar_color"],
        "role": "member"
    }
    
    await db.projects.update_one(
        {"id": project_id},
        {"$push": {"members": member_data}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_activity(project_id, user["id"], user["name"], "member_added", f"Added {new_member['name']} to the project")
    await send_notification_email(data.email, f"You've been added to {project['name']}", f"{user['name']} added you to the project '{project['name']}'")
    
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return updated

@api_router.delete("/projects/{project_id}/members/{member_id}")
async def remove_member(project_id: str, member_id: str, user=Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id, "owner_id": user["id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not owner")
    
    if member_id == project["owner_id"]:
        raise HTTPException(status_code=400, detail="Cannot remove the owner")
    
    await db.projects.update_one(
        {"id": project_id},
        {"$pull": {"members": {"id": member_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Unassign tasks from removed member
    await db.tasks.update_many(
        {"project_id": project_id, "assignee_id": member_id},
        {"$set": {"assignee_id": None}}
    )
    
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return updated

# ============ TASK ROUTES ============

@api_router.post("/projects/{project_id}/tasks")
async def create_task(project_id: str, data: TaskCreate, user=Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id, "members.id": user["id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get max order for the status column
    max_order_task = await db.tasks.find_one(
        {"project_id": project_id, "status": data.status},
        {"_id": 0, "order": 1},
        sort=[("order", -1)]
    )
    next_order = (max_order_task["order"] + 1) if max_order_task and "order" in max_order_task else 0
    
    task_id = str(uuid.uuid4())
    task_doc = {
        "id": task_id,
        "project_id": project_id,
        "title": data.title,
        "description": data.description or "",
        "status": data.status,
        "priority": data.priority,
        "assignee_id": data.assignee_id,
        "created_by": user["id"],
        "due_date": data.due_date,
        "order": next_order,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tasks.insert_one(task_doc)
    
    result = dict(task_doc)
    result.pop("_id", None)
    
    await log_activity(project_id, user["id"], user["name"], "task_created", f"Created task '{data.title}'")
    await broadcast_to_project(project_id, {"type": "task_created", "data": result})
    
    if data.assignee_id and data.assignee_id != user["id"]:
        assignee = await db.users.find_one({"id": data.assignee_id}, {"_id": 0})
        if assignee:
            await send_notification_email(assignee["email"], f"New task assigned: {data.title}", f"{user['name']} assigned you a task in '{project['name']}'")
    
    return result

@api_router.get("/projects/{project_id}/tasks")
async def get_tasks(project_id: str, user=Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id, "members.id": user["id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tasks = await db.tasks.find({"project_id": project_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    return tasks

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, data: TaskUpdate, user=Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    project = await db.projects.find_one({"id": task["project_id"], "members.id": user["id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=403, detail="Not a project member")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    changes = []
    
    if data.title is not None:
        update_data["title"] = data.title
        changes.append(f"title to '{data.title}'")
    if data.description is not None:
        update_data["description"] = data.description
    if data.status is not None and data.status != task["status"]:
        update_data["status"] = data.status
        changes.append(f"status to '{data.status}'")
    if data.priority is not None:
        update_data["priority"] = data.priority
        changes.append(f"priority to '{data.priority}'")
    if data.assignee_id is not None:
        update_data["assignee_id"] = data.assignee_id if data.assignee_id else None
    if data.due_date is not None:
        update_data["due_date"] = data.due_date if data.due_date else None
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    
    if changes:
        await log_activity(task["project_id"], user["id"], user["name"], "task_updated", f"Updated '{task['title']}': {', '.join(changes)}")
    
    await broadcast_to_project(task["project_id"], {"type": "task_updated", "data": updated_task})
    return updated_task

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user=Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    project = await db.projects.find_one({"id": task["project_id"], "members.id": user["id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=403, detail="Not a project member")
    
    await db.tasks.delete_one({"id": task_id})
    await log_activity(task["project_id"], user["id"], user["name"], "task_deleted", f"Deleted task '{task['title']}'")
    await broadcast_to_project(task["project_id"], {"type": "task_deleted", "data": {"id": task_id}})
    return {"status": "deleted"}

@api_router.put("/tasks/{task_id}/move")
async def move_task(task_id: str, data: TaskMove, user=Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    project = await db.projects.find_one({"id": task["project_id"], "members.id": user["id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=403, detail="Not a project member")
    
    old_status = task["status"]
    new_status = data.status
    new_order = data.order
    
    # Update orders in the target column
    if old_status == new_status:
        # Reorder within same column
        old_order = task.get("order", 0)
        if new_order > old_order:
            await db.tasks.update_many(
                {"project_id": task["project_id"], "status": new_status, "order": {"$gt": old_order, "$lte": new_order}, "id": {"$ne": task_id}},
                {"$inc": {"order": -1}}
            )
        else:
            await db.tasks.update_many(
                {"project_id": task["project_id"], "status": new_status, "order": {"$gte": new_order, "$lt": old_order}, "id": {"$ne": task_id}},
                {"$inc": {"order": 1}}
            )
    else:
        # Moving to different column - shift orders in destination
        await db.tasks.update_many(
            {"project_id": task["project_id"], "status": new_status, "order": {"$gte": new_order}, "id": {"$ne": task_id}},
            {"$inc": {"order": 1}}
        )
        # Shift orders in source
        await db.tasks.update_many(
            {"project_id": task["project_id"], "status": old_status, "order": {"$gt": task.get("order", 0)}, "id": {"$ne": task_id}},
            {"$inc": {"order": -1}}
        )
    
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {"status": new_status, "order": new_order, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    
    if old_status != new_status:
        await log_activity(task["project_id"], user["id"], user["name"], "task_moved", f"Moved '{task['title']}' from {old_status} to {new_status}")
    
    # Broadcast full task list for accurate reordering
    all_tasks = await db.tasks.find({"project_id": task["project_id"]}, {"_id": 0}).sort("order", 1).to_list(1000)
    await broadcast_to_project(task["project_id"], {"type": "tasks_reordered", "data": all_tasks})
    
    return updated_task

# ============ ACTIVITY ROUTES ============

@api_router.get("/activity")
async def get_activity(user=Depends(get_current_user), limit: int = Query(default=20, le=50)):
    # Get user's projects
    projects = await db.projects.find({"members.id": user["id"]}, {"_id": 0, "id": 1}).to_list(100)
    project_ids = [p["id"] for p in projects]
    
    activities = await db.activity.find(
        {"project_id": {"$in": project_ids}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return activities

@api_router.get("/projects/{project_id}/activity")
async def get_project_activity(project_id: str, user=Depends(get_current_user), limit: int = Query(default=20, le=50)):
    project = await db.projects.find_one({"id": project_id, "members.id": user["id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    activities = await db.activity.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return activities

# ============ DASHBOARD STATS ============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user=Depends(get_current_user)):
    projects = await db.projects.find({"members.id": user["id"]}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    project_ids = [p["id"] for p in projects]
    
    total_tasks = await db.tasks.count_documents({"project_id": {"$in": project_ids}})
    todo_tasks = await db.tasks.count_documents({"project_id": {"$in": project_ids}, "status": "todo"})
    in_progress_tasks = await db.tasks.count_documents({"project_id": {"$in": project_ids}, "status": "in_progress"})
    review_tasks = await db.tasks.count_documents({"project_id": {"$in": project_ids}, "status": "review"})
    done_tasks = await db.tasks.count_documents({"project_id": {"$in": project_ids}, "status": "done"})
    my_tasks = await db.tasks.count_documents({"assignee_id": user["id"], "project_id": {"$in": project_ids}})
    overdue_tasks = await db.tasks.count_documents({
        "project_id": {"$in": project_ids},
        "due_date": {"$lt": datetime.now(timezone.utc).isoformat()},
        "status": {"$ne": "done"}
    })
    
    return {
        "total_projects": len(projects),
        "total_tasks": total_tasks,
        "todo_tasks": todo_tasks,
        "in_progress_tasks": in_progress_tasks,
        "review_tasks": review_tasks,
        "done_tasks": done_tasks,
        "my_tasks": my_tasks,
        "overdue_tasks": overdue_tasks
    }

# ============ USER SEARCH ============

@api_router.get("/users/search")
async def search_users(q: str = Query(..., min_length=1), user=Depends(get_current_user)):
    users = await db.users.find(
        {"$or": [
            {"email": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0, "password_hash": 0}
    ).to_list(10)
    return users

# ============ WEBSOCKET ============

@app.websocket("/api/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str, token: str = Query(None)):
    # Verify token
    if not token:
        await websocket.close(code=4001)
        return
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001)
            return
    except JWTError:
        await websocket.close(code=4001)
        return
    
    await manager.connect(websocket, project_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle ping/pong for keepalive
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)

# ============ HEALTH CHECK ============

@api_router.get("/")
async def root():
    return {"message": "TaskFlow Pro API", "status": "running"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.projects.create_index("id", unique=True)
    await db.tasks.create_index("id", unique=True)
    await db.tasks.create_index([("project_id", 1), ("status", 1), ("order", 1)])
    await db.activity.create_index([("project_id", 1), ("created_at", -1)])
    logger.info("TaskFlow Pro API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
