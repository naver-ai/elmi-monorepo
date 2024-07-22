# This file is for proactivechatbot

import json
import asyncio
from os import path

from sqlalchemy.future import select

from backend.database import db_sessionmaker, save_thread_message, create_thread
from backend.database.models import Inference1Result, Inference2Result
from backend.utils.env_helper import get_env_variable, EnvironmentVariables
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.chat_history import BaseChatMessageHistory, InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage


# Retrieve API key from environment variable
api_key = get_env_variable(EnvironmentVariables.OPENAI_API_KEY)

# Initialize the OpenAI client
client = ChatOpenAI(
    api_key=api_key,
    model_name="gpt-4o",
    temperature=1,
    max_tokens=2048,
    top_p=1,
    frequency_penalty=0,
    presence_penalty=0
)

# Fetch inference results for a specific line ID from the database.
async def fetch_inference1_results(line_id: str):

    async with db_sessionmaker() as session:
        stmt = select(Inference1Result).where(Inference1Result.line_id == line_id)
        result = await session.exec(stmt)
        results = result.scalars().all()
        return [{"Challenges": result.challenges, "Description": result.description} for result in results]
    

# Fetch inference results for a specific line ID from the database (glossing)
async def fetch_inference2_results(line_id: str):

    async with db_sessionmaker() as session:
        stmt = select(Inference2Result).where(Inference2Result.line_id == line_id)
        result = await session.exec(stmt)
        results = result.scalars().all()
        return [{"Gloss": result.gloss, "Gloss_Description": result.gloss_description} for result in results]
    

# Store for session histories
store = {}

# Retrieve or create session history for the given session ID.
def get_session_history(session_id: str) -> BaseChatMessageHistory:

    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]


# Function to classify user intent
def classify_user_intent(user_input: str):
    classification_system_prompt = '''
    You are a helpful assistant that classifies user queries.
    Your task is to determine which feature the user query is related to based on the following categories:

    1. Meaning: Questions about understanding or interpreting the lyrics.
    2. Glossing: Questions about how to sign specific words or phrases.
    3. Emoting: Questions about expressing emotions through facial expressions and body language.
    4. Timing: Questions about the timing or rhythm of signing.

    You will receive input in the following format:
    {user_query}

    Classify the query into one of the following categories:
    - Meaning
    - Glossing
    - Emoting
    - Timing

    Provide the output one of: "Meaning", "Glossing", "Emoting", "Timing" :
    string 
    '''

    # Define the prompt template
    prompt_template = PromptTemplate(
      template = classification_system_prompt
    )
    # Initialize the chain
    llm_chain = prompt_template | client | StrOutputParser()


    # Execute the chain with the lyrics input
    response_classification= llm_chain.invoke({"user_query": user_input})

    return response_classification
    

# Create a formatted system template string with inference results.
def create_system_template(intent: str, results: list) -> str:
    if intent == "Meaning":
        system_template = '''
        Your name is ELMI, a helpful chatbot that helps users translate ENG lyrics to ASL.
        ELMI specializes in guiding users to have a critical thinking process about the lyrics.
        ELMI you are an active listener.
        You are not giving all the possible answers, instead, listen to what the users are thinking and ask them to reflect on little things a bit more (What does the user want?)
        The user decides whether or not they care to engage in further chat.

        You start by prompting questions to users of the input line.

        You are using the outputs from the feature #1:
        {line_inspection_results}

        Key characteristics of ELMI:
        - Clear Communication: ELMI offers simple, articulate instructions with engaging examples.
        - Humor: ELMI infuses the sessions with light-hearted humour to enhance the enjoyment. Add some emojis.
        - Empathy and Sensitivity: ELMI shows understanding and empathy, aligning with the participant's emotional state.

        Handling Conversations:
        - Redirecting Off-Topic Chats: ELMI gently guides the conversation back to lyrics interpretation topics, suggesting social interaction with friends for other discussions.

        Support and Encouragement:
        - EMLI offers continuous support, using her identity to add fun and uniqueness to her encouragement.
        For additional assistance, she reminds participants to reach out to the study team.

        Your role:
        Given the tags above, you will create some thought-provoking questions for users and start a discussion with the user. Your role is to help users to come up with their idea.
        When you suggest something, make sure to ask if the user wants other things.
        '''
        return system_template.format(line_inspection_results=json.dumps(results, indent=2))

    elif intent == "Glossing":
        system_template = '''
        Your name is ELMI, a helpful chatbot that helps users translate ENG lyrics to ASL.
        ELMI specializes in guiding users to have a critical thinking process about the lyrics.
        ELMI you are an active listener.
        You are not giving all the possible answers, instead, listen to what the users are thinking and ask them to reflect on little things a bit more (What does the user want?)
        The user decides whether or not they care to engage in further chat.

        You start by prompting questions to users of the input line.

        You are using the outputs from the feature #2:
        {line_glossing_results}

        The first answer should be string plain text formated {line_glossing_results} (remove JSON format) with added explannation. Do not introduce yourself.

        Key characteristics of ELMI:
        - Clear Communication: ELMI offers simple, articulate instructions with engaging examples.
        - Humor: ELMI infuses the sessions with light-hearted humour to enhance the enjoyment. Add some emojis.
        - Empathy and Sensitivity: ELMI shows understanding and empathy, aligning with the participant's emotional state.

        Handling Conversations:
        - Redirecting Off-Topic Chats: ELMI gently guides the conversation back to lyrics interpretation topics, suggesting social interaction with friends for other discussions.

        Support and Encouragement:
        - EMLI offers continuous support, using her identity to add fun and uniqueness to her encouragement.
        For additional assistance, she reminds participants to reach out to the study team.

        Your role:
        Given the tags above, you will create some thought-provoking questions for users and start a discussion with the user. Your role is to help users to come up with their idea.
        When you suggest something, make sure to ask if the user wants other things.
        '''
        return system_template.format(line_glossing_results=json.dumps(results, indent=2))


# Initiate a proactive chat session with a user based on a specific line ID.
def proactive_chat(line_id: str):
    inference1_results = asyncio.run(fetch_inference1_results(line_id))
    inference2_results = asyncio.run(fetch_inference2_results(line_id))

    # Use the classified user intent to decide which inference results to use
    user_input = input("You: ")
    classification_result = classify_user_intent(user_input)
    intent = classification_result

    if intent == "Meaning":
        system_template = create_system_template(intent, inference1_results)
        input_variables = ["line_inspection_results", "history", "input"]
    elif intent == "Glossing":
        system_template = create_system_template(intent, inference2_results)
        input_variables = ["line_glossing_results", "history", "input"]
    else:
        print(f"Feature {intent} is not yet implemented.")
        return
    
    custom_prompt_template = PromptTemplate(
        input_variables=input_variables,
        template=system_template + "\n\n{history}\nUser: {input}\nELMI:"
    )

    conversation_chain = RunnableWithMessageHistory(
        runnable=client,
        get_session_history=get_session_history,
        prompt=custom_prompt_template
    )

    config = {"configurable": {"session_id": "unique_session_id"}}  # Change session_id as needed

    initial_messages = [
        SystemMessage(content=system_template)
    ]

    async def main():
        async with db_sessionmaker() as session:
            thread_id = await create_thread(session, line_id)

            initial_response = conversation_chain.invoke(
                initial_messages,
                config=config
            )
            print(f"Initial Questions: {initial_response.content}")
            await save_thread_message(session, thread_id, 'assistant', initial_response.content, 'initial')

            while True:
                user_input = input("You: ")
                if user_input.lower() in ["exit", "quit"]:
                    break

                await save_thread_message(session, thread_id, 'user', user_input, 'ongoing')

                assistant_response = conversation_chain.invoke(
                    [HumanMessage(content=user_input)],
                    config=config
                )
                print(f"ELMI: {assistant_response.content}")
                await save_thread_message(session, thread_id, 'assistant', assistant_response.content, 'ongoing')

    asyncio.run(main())

# Example usage
if __name__ == "__main__":
    line_id = "hNI4Ydr2haGdtNrssrId_"  # Replace with actual line ID
    proactive_chat(line_id)