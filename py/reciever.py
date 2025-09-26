from .utils import Field
from comfy.comfy_types import IO


class PromptReciever:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {}, 
            "optional": {
                "positive": Field.any(), 
                "negative": Field.any(), 
                "model_name": Field.any(),  
            }
        }
    
    RETURN_TYPES = ()
    FUNCTION = "execute"
    
    def execute(self, **kwargs):
        return ()

