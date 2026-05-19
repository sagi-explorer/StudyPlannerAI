def build_review_prompt(
    *,
    strictness: int,
    review_type: str,
    period_start: str,
    period_end: str,
    tasks_data: str,
    goals_progress: str,
    focus_session_stats: str,
) -> str:
    return (
        "你是一个学习/工作计划复盘助手。\n"
        f"当前严厉程度：{strictness}/5（1=温和鼓励，5=毒舌鞭策）\n"
        "\n"
        f"请根据以下数据生成{review_type}复盘报告：\n"
        "\n"
        f"复盘周期：{period_start} 至 {period_end}\n"
        "任务数据：\n"
        f"{tasks_data}\n"
        "\n"
        "目标进度：\n"
        f"{goals_progress}\n"
        "\n"
        "学习时长数据：\n"
        f"{focus_session_stats}\n"
        "\n"
        "请包含：\n"
        "1. 完成情况总结\n"
        "2. 未完成/逾期任务分析\n"
        "3. 延期情况分析\n"
        "4. 学习时长分析（与上一周期对比）\n"
        "5. 目标推进情况（是否在轨道上）\n"
        "6. 下一阶段建议\n"
        "7. 根据严厉程度给出相应语气的总评\n"
        "8. 如果周/月目标达成，给予庆祝鼓励语；如果未达成，给予督促和改进建议\n"
        "\n"
        "输出格式为 Markdown。"
    )
