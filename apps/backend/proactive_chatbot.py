# This file is for proactivechatbot 

from backend.config import ElmiConfig
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from backend.utils.env_helper import get_env_variable, EnvironmentVariables
from os import path
import json

import asyncio
from backend.database import db_sessionmaker, insert_inference1_result, insert_combined_result
from backend.database.models import Line, Verse, Project, Song, Inference1Result, GlossDescription, Inference234Result
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_core.chat_history import BaseChatMessageHistory, InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage


# Retrieve API key from environment variable
api_key = get_env_variable(EnvironmentVariables.OPENAI_API_KEY)

# Initialize the OpenAI client
client = ChatOpenAI(api_key=api_key, 
                    model_name="gpt-4o", 
                    temperature=1, 
                    max_tokens=2000, 
                    top_p=1, 
                    frequency_penalty=0, 
                    presence_penalty=0
                    )

# fetch the inference1 results for specific line
async def fetch_inference1_results(line_id: str):
    async with db_sessionmaker() as session:
        stmt = select(Inference1Result).where(Inference1Result.line_id == line_id)
        result = await session.exec(stmt)
        results = result.scalars().all()
        return [{"Challenges": result.challenges, "Description": result.description} for result in results]

# Fetching the data for a specific line_id
line_id = "GOUjWmpRftaHnLwwHSfww"  # Replace with actual line ID
inference1_results = asyncio.run(fetch_inference1_results(line_id))

# Store for session histories
store = {}

# Function to get session history
def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]

def proactive_chat(line_id: str):
    system_template_chatbot = '''  
    Your name is ELMI, a helpful chatbot that helps users translate ENG lyrics to ASL.
    ELMI specializes in guiding users to have a critical thinking process about the lyrics.
    ELMI you are an active listener.
    You are not giving all the  possible answers, instead, listen to what the users are thinking and ask them to reflect on little things a bit more (What does the user want?)
    The user decides whether or not they care to engage in further chat.

    You start by prompting questions to users of the input line.

    You are using the outputs from the feature #1:
    {line_inspection_results}

    Key characteristics of ELMI:
    - Clear Communication: ELMI offers simple, articulate instructions with engaging examples.
    - Humor: ELMI infuses the sessions with light-hearted  humour to enhance the enjoyment. Add some emojis.
    - Empathy and Sensitivity: ELMI shows understanding and empathy, aligning with the participant's emotional state.

    Handling Conversations:
    - Redirecting Off-Topic Chats: ELMI gently guides the conversation back to lyrics interpretation mtopics, suggesting social interaction with friends for other discussions.

    Support and Encouragement:
    - EMLI offers continuous support, using her identity to add fun and uniqueness to her encouragement.
    For additional assistance, she reminds participants to reach out to the study team.

    Your role:
    Given the tags above, you will create some thought-provoking questions for users and start a discussion with the user. Your role is to help users to come up with their idea.
    When you suggest the something, make sure to ask if the user wants other things.
    '''

    # Properly format the line inspection results as a string
    line_inspection_results_str = json.dumps(inference1_results, indent=2)

      # Define the prompt template
    prompt_template = PromptTemplate(
        template = system_template_chatbot
    )

    # Define the custom prompt template
    custom_prompt_template = PromptTemplate(
        input_variables=["line_inspection_results", "history", "input"],
        template=system_template_chatbot + "\n\n{history}\nUser: {input}\nELMI:"
    )


    # Initialize the conversation chain with RunnableWithMessageHistory
    conversation_chain = RunnableWithMessageHistory(
        runnable=client,
        get_session_history=get_session_history,
        prompt=custom_prompt_template
    )

    # Configuration for the session
    config = {"configurable": {"session_id": "unique_session_id"}}  # You can change the session_id as needed

    # Add the initial system message to the conversation
    initial_messages = [
        SystemMessage(content=system_template_chatbot.format(line_inspection_results=line_inspection_results_str))
    ]

    # Generate initial questions using the conversation chain
    initial_response = conversation_chain.invoke(
        initial_messages,
        config=config
    )
    print(f"Initial Questions: {initial_response.content}")

    while True:
        # Get user input
        user_input = input("You: ")
        if user_input.lower() in ["exit", "quit"]:
            break

        # Handle chat continuation
        assistant_response = conversation_chain.invoke(
            [HumanMessage(content=user_input)],
            config=config
        )
        print(f"ELMI: {assistant_response.content}")


# Example usage
if __name__ == "__main__":
    line_id = "GOUjWmpRftaHnLwwHSfww"  # Replace with actual line ID
    proactive_chat(line_id)