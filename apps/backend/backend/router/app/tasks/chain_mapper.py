from abc import ABC, abstractmethod
from time import perf_counter
from typing import Generic, TypeVar

from langchain_core.prompts.chat import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.exceptions import OutputParserException
from langchain_core.runnables.retry import RunnableRetry
from langchain.output_parsers import PydanticOutputParser
from langchain_core.runnables import RunnableConfig, Runnable
from pydantic import BaseModel, ValidationError
from langchain_core.language_models.chat_models import BaseChatModel

from backend.utils.env_helper import EnvironmentVariables, get_env_variable

InputType = TypeVar('InputType')
OutputType = TypeVar('OutputType', bound=BaseModel)

class ChainMapper(ABC, Generic[InputType, OutputType]):

    def __init__(self, name: str, outputModel: type[OutputType],  system_instruction: str,
                model : BaseChatModel | None = None
                ) -> None:
        super().__init__()

        self._name = name

        # Define the prompt template
        chat_prompt = ChatPromptTemplate.from_messages([
            ("system", system_instruction),
            ("human", "{input}")
        ])

        chat_model = model or ChatOpenAI(api_key=get_env_variable(EnvironmentVariables.OPENAI_API_KEY), 
                                model_name="gpt-4o", 
                                temperature=1, 
                                max_tokens=2048,
                                model_kwargs=dict(
                                    frequency_penalty=0, 
                                    presence_penalty=0
                                ))
        

        # Initialize the chain
        self._chain = self.__input_parser | RunnableRetry(name="LLM-routin", bound = chat_prompt | chat_model | PydanticOutputParser(pydantic_object=outputModel) | self._postprocess_output,
                                                         retry_exception_types=(ValidationError, AssertionError, OutputParserException), 
                                                         max_attempt_number=5)

    @classmethod
    def __input_parser(cls, input: InputType, config: RunnableConfig)->dict:
        config["metadata"].update(input.__dict__)
        return {
            "input": cls._input_to_str(input, config)
        }
    
    @classmethod
    @abstractmethod
    def _postprocess_output(cls, output: OutputType, config: RunnableConfig)->OutputType:
        return output

    @classmethod
    @abstractmethod
    def _input_to_str(cls, input: InputType, config: RunnableConfig)->str:
        pass
    
    @classmethod
    @abstractmethod
    def _postprocess_output(cls, output: OutputType, config: RunnableConfig)->OutputType:
        return output
    
    @property
    def chain(self)-> Runnable:
        return self._chain

    async def run(self, input: InputType) -> OutputType:
        ts = perf_counter()

        result = await self.chain.ainvoke(input)

        te = perf_counter()

        print(f"{self._name} took {te-ts} sec.")

        return result