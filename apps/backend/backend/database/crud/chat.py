from sqlmodel.ext.asyncio.session import AsyncSession
from backend.database.models import Thread, ThreadMessage
# Save a message to the ThreadMessage table.

async def save_thread_message(session: AsyncSession, project_id: str, thread_id: str, role, message, mode):
    new_message = ThreadMessage(
        thread_id=thread_id,
        project_id=project_id,
        role=role,
        message=message,
        mode=mode
    )
    session.add(new_message)
    await session.commit()

# Create a new thread and return its ID."""
async def create_thread(session: AsyncSession, project_id: str, line_id: str):
    new_thread = Thread(line_id=line_id, project_id=project_id)
    session.add(new_thread)
    await session.commit()
    return new_thread.id
