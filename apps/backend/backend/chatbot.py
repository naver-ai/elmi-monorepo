# This file is for proactivechatbot

import json
import asyncio
from os import path

from pydantic import BaseModel
from sqlalchemy.future import select

from backend.database import db_sessionmaker
from backend.database.crud.chat import create_thread, save_thread_message
from backend.database.crud.project import fetch_line_annotation_by_line, fetch_line_inspection_by_line
from backend.database.models import LineAnnotation, LineInspection
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
    You are a helpful assistant that classifies user queries into one of the following categories:

    1. Meaning: Questions about understanding or interpreting the lyrics.
    2. Glossing: Questions about how to sign specific words or phrases.
    3. Emoting: Questions about expressing emotions through facial expressions and body language.
    4. Timing: Questions about the timing or rhythm of the gloss, including changing and adjusting the gloss (shorter or longer).

    You will receive input in the following format:
    {user_query}

    Classify the query into one of these categories:
    - Meaning
    - Glossing
    - Emoting
    - Timing

    Provide the output as one of these strings: Meaning, Glossing, Emoting, Timing.
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
def create_system_template(intent: str, result: BaseModel) -> str:
    if intent == "Meaning":
        system_template = '''
        Your name is ELMI, a helpful chatbot that helps users translate ENG lyrics to ASL.
        ELMI specializes in guiding users to have a critical thinking process about the lyrics.
        ELMI you are an active listener.
        You are not giving all the possible answers, instead, listen to what the users are thinking and ask them to reflect on little things a bit more (What does the user want?)
        The user decides whether or not they care to engage in further chat.

        You start by prompting questions to users of the input line. 
        
        You are answering to questions such as:
        "How should I understand the deeper context of this line?"
        "Can you explain the underlying message of this line?"
        "What is the hidden meaning behind this line?"


        You are using the outputs from the previous note on the line:
        {line_inspection_results}

        The first answer should be string plain text formated {line_inspection_results}(remove JSON format) with added explannation. 
        Do not introduce yourself. 

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
        Given the {line_inspection_results} above, you will create some thought-provoking questions for users and start a discussion with the user about the meaning of the lyrics. 
        Your role is to help users to come up with their idea.
        When you suggest something, make sure to ask if the user wants other things.
        '''
        return system_template.format(line_inspection_results=result.model_dump_json(include={"challenges", "description"}))
    
    if intent == "Glossing":
        system_template = '''
        Your name is ELMI, a helpful chatbot that helps users translate ENG lyrics to ASL gloss.
        ELMI specializes in guiding users to have a critical thinking process about the lyrics.
        ELMI you are an active listener. 

        You are not giving all the possible answers, instead, listen to what the users are thinking and ask them to reflect on little things a bit more (What does the user want?)
        The user decides whether or not they care to engage in further chat.

        You start by prompting questions to users.

        You are answering to questions such as:
        "How do you sign this specific line in ASL?"
        "What is the ASL translation for the line?"
        "Can you show me the ASL signs for this line?"

        You are using the outputs from the glosses of the line:
        {line_glossing_results}

        The first answer should be string plain text formated {line_glossing_results}(remove JSON format) with added explannation. 
        Do not introduce yourself. 

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
        Given the {line_glossing_results} above, you will create some thought-provoking questions for users and start a discussion with the user about the gloss. 
        Your role is to help users to come up with their idea.
        When you suggest something, make sure to ask if the user wants other things.
        '''
        return system_template.format(line_glossing_results=result.model_dump_json(include={"gloss", "gloss_description"}))

    if intent == "Emoting":
        system_template = '''
        Your name is ELMI, a helpful chatbot that helps users translate ENG lyrics to ASL.
        ELMI specializes in guiding users to have a critical thinking process about the lyrics.
        ELMI you are an active listener.
        You are not giving all the possible answers, instead, listen to what the users are thinking and ask them to reflect on little things a bit more (What does the user want?)
        The user decides whether or not they care to engage in further chat.

        You start by prompting questions to users of the input line.

        You are answering to questions such as:
        "How can convey the emotion in this line?"
        "What non-manual markers would you use to express the mood of this line?"
        "Can you demonstrate how to express the mood of this line?"



        You are using the outputs from the emotion of the line (emotion, facial expression, body gestures):
        {line_emoting_results}

        The first answer should be string plain text formated {line_emoting_results} (remove JSON format) with added explannation. Do not introduce yourself.

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
        Given the {line_emoting_results} above, you will create some thought-provoking questions for users and start a discussion with the user about performing the gloss. 
        Your role is to help users to come up with their idea.
        When you suggest something, make sure to ask if the user wants other things.
        '''
        return system_template.format(line_emoting_results=result.model_dump_json(include={"mood", "facial_expression", "body_gesture", "emotion_description"}))
    

    elif intent == "Timing":
        system_template = '''
        Your name is ELMI, a helpful chatbot that helps users translate ENG lyrics to ASL.
        ELMI specializes in guiding users to have a critical thinking process about the lyrics.
        ELMI you are an active listener.
        You are not giving all the possible answers, instead, listen to what the users are thinking and ask them to reflect on little things a bit more (What does the user want?)
        The user decides whether or not they care to engage in further chat.

        You start by prompting questions to users of the input line.

        You are answering to questions such as:
        "Can you show me how to modify the gloss to match the song's rhythm?"
        "How can you tweak the gloss for different parts of the line to match the timing?"
        "What changes to the gloss help align it with the song’s rhythm?"


        You are using the outputs from the gloss options of the line (shorter and longer version of the gloss):
        {line_timing_results}

        The first answer should be string plain text formated {line_timing_results} (remove JSON format) with added explannation. 
        Do not introduce yourself.

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
        Given the {line_timing_results} above, you will create some thought-provoking questions for users and start a discussion with the user about adjusting the gloss. 
        Your role is to help users to come up with their idea.
        When you suggest something, make sure to ask if the user wants other things.
        '''
        return system_template.format(line_timing_results=result.model_dump_json(include={"gloss_alts"}))

# Initiate a proactive chat session with a user based on a specific line ID.
async def proactive_chat(project_id: str, line_id: str, user_input: str, intent: str, is_button_click=False):
    async with db_sessionmaker() as session:
        line_inspection: LineInspection = await fetch_line_inspection_by_line(session, project_id, line_id)
        line_annotation: LineAnnotation = await fetch_line_annotation_by_line(session,  project_id, line_id)
        

        # Use the provided intent directly if it's a button click
        if is_button_click:
            print(f"Button click detected, using provided intent: {intent}")
        else:
            classification_result = classify_user_intent(user_input)
            intent = classification_result
            print(f"Classified intent: {intent}")

        if intent == "Meaning":
            system_template = create_system_template(intent, line_inspection)
            input_variables = ["line_inspection_results", "history", "input"]
        elif intent == "Glossing":
            system_template = create_system_template(intent, line_annotation)
            input_variables = ["line_glossing_results", "history", "input"]
        elif intent == "Emoting":
            system_template = create_system_template(intent, line_annotation)
            input_variables = ["line_emoting_results", "history", "input"]
        elif intent == "Timing":
            system_template = create_system_template(intent, line_annotation)
            input_variables = ["line_timing_results", "history", "input"]
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

        
        thread_id = await create_thread(session, line_id)

        # Save the initial user message or hidden user message
        initial_user_message = user_input

        await save_thread_message(session, thread_id, 'user', initial_user_message, 'initial')

        initial_response = await conversation_chain.ainvoke(
                initial_messages,
                config=config
        )

        # Save the initial assistant message
        await save_thread_message(session, thread_id, 'assistant', initial_response.content, 'initial')

        if is_button_click:
            # For button clicks, return hidden user message + AI message
            print(f"Hidden User Message: {user_input}\nAI Message: {initial_response.content}")
        else:
            # For normal open-ended questions, return only the AI message
            print(f"AI Message: {initial_response.content}")

        while True:
            user_input = input("You: ")
            if user_input.lower() in ["exit", "quit"]:
                break

            await save_thread_message(session, thread_id, 'user', user_input, 'ongoing')

            assistant_response = await conversation_chain.ainvoke(
                [HumanMessage(content=user_input)],
                config=config
            )
            print(f"ELMI: {assistant_response.content}")
            await save_thread_message(session, thread_id, 'assistant', assistant_response.content, 'ongoing')


if __name__ == "__main__":
    project_id = "yd_dd-qg5YqCnqTYmscj9"  # Replace with actual project ID
    line_id = "VXG16LLmAnoISFRIT9AF0"  # Replace with actual line ID

    # Simulate a button click for
    # print("Simulating button click for Emoting...")
    # asyncio.run(proactive_chat(project_id, line_id, "Feature button clicked for Emoting", "Emoting", is_button_click=True))
    
    # Prompt for a normal user input
    user_input = input("Enter your query: ")
    intent = classify_user_intent(user_input)
    asyncio.run(proactive_chat(project_id,line_id, user_input, intent, is_button_click=False))


