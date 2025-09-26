from .utils import Field
from comfy.comfy_types import IO
import json

class PromptSelector:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {}, 
            "optional": {
                "prev_positive": Field.string(forceInput=True), 
                "prev_negative": Field.string(forceInput=True), 
                "values": Field.string(multiline=True), 
            }
        }
        
    RETURN_TYPES = (IO.STRING, IO.STRING)
    RETURN_NAMES = ("positve", "negative")
    FUNCTION = "execute"

    def execute(self, prev_positive="", prev_negative="", values=""):
        values = json.loads(values)
        positive = prev_positive
        negative = prev_negative
        for value in values:
            if value.get("enabled"):
                node = value.get("fileNode", {})
                positive += node.get("positive", "")
                negative += node.get("negative", "")
        
        return (positive, negative)