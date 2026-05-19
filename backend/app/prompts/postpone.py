def build_postpone_prompt(
    *,
    task_title: str,
    due_date: str,
    postpone_count: int,
    user_reason: str,
    today: str,
    upcoming_tasks: str,
    related_tasks: str,
    strictness: int,
) -> str:
    return (
        "用户想要延期以下任务：\n"
        f"任务：{task_title}\n"
        f"当前截止日期：{due_date}\n"
        f"已延期次数：{postpone_count}\n"
        f"用户说的原因：{user_reason}\n"
        "\n"
        f"当前日期：{today}\n"
        "该用户后续几天的任务安排：\n"
        f"{upcoming_tasks}\n"
        "\n"
        "关联任务：\n"
        f"{related_tasks}\n"
        "\n"
        "请分析延期的影响，并建议一个合适的新截止日期。考虑：\n"
        "1. 后续几天的任务密度\n"
        "2. 关联任务是否受影响\n"
        "3. 该任务的紧急程度\n"
        "4. 已延期次数（多次延期应更严格提醒）\n"
        "\n"
        f"当前 AI 严厉程度：{strictness}/5"
    )
