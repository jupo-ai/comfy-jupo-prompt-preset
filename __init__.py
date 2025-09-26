from .py.utils import mk_name, set_default_category, get_display_name_mappins
from .py import endpoints # noqa: F401
from .py import reciever
from .py import selector

NODE_CLASS_MAPPINGS = {
    mk_name("Prompt_Reciever"): reciever.PromptReciever, 
    mk_name("Prompt_Selector"): selector.PromptSelector, 
}

set_default_category(NODE_CLASS_MAPPINGS)

NODE_DISPLAY_NAME_MAPPINGS = get_display_name_mappins(NODE_CLASS_MAPPINGS)
WEB_DIRECTORY = "./web"
