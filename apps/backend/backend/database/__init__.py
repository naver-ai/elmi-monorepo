from .engine import *

# Save a message to the ThreadMessage table.
async def save_thread_message(session, thread_id, role, message, mode):
    new_message = ThreadMessage(
        thread_id=thread_id,
        role=role,
        message=message,
        mode=mode
    )
    session.add(new_message)
    await session.commit()

# Create a new thread and return its ID."""
async def create_thread(session, start_line_id):
    new_thread = Thread(start_line_id=start_line_id, end_line_id=None)
    session.add(new_thread)
    await session.commit()
    return new_thread.id
