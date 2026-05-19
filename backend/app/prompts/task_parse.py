def build_task_parse_prompt(today: str, categories: list[str]) -> str:
    categories_str = "、".join(categories) if categories else "LLM Lab、Work Hub"
    return (
        "你是一个任务解析引擎。请从用户输入中提取所有任务信息。\n"
        "\n"
        f"当前日期：{today}\n"
        f"可用分类：{categories_str}\n"
        "\n"
        "请以 JSON 数组格式返回，每个任务包含：\n"
        "- title: 任务标题（简洁明确）\n"
        "- category: 所属分类名称\n"
        '- due_date: 截止日期（YYYY-MM-DD 格式，如果用户说\u201c下周三\u201d请计算具体日期）\n'
        "- priority: 优先级（low/medium/high/urgent，根据语气和关键词判断）\n"
        "- description: 补充描述（如果有的话）\n"
        "\n"
        "如果无法确定某个字段，使用合理的默认值"
        '（分类默认\u201cLLM Lab\u201d，优先级默认\u201cmedium\u201d；'
        '若明显是工作相关则分类为\u201cWork Hub\u201d）。\n'
        "\n"
        "如果用户输入不包含任何可识别的任务信息，返回空数组 []。\n"
        "\n"
        "直接返回 JSON，不要包裹在 markdown 代码块中，不要添加任何解释文字。"
    )
