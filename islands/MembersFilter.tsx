import { useState } from "preact/hooks";

type LevelType = "all" | "beginner" | "intermediate" | "advanced";
type GoalType = "all" | "crossfit" | "hyrox" | "general";

export default function MembersFilter() {
  const [searchTerm, setSearchTerm] = useState("");
  const [level, setLevel] = useState<LevelType>("all");
  const [goal, setGoal] = useState<GoalType>("all");

  const handleSearch = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setSearchTerm(value);
    filterMembers(value, level, goal);
  };

  const handleLevelChange = (e: Event) => {
    const value = (e.target as HTMLSelectElement).value as LevelType;
    setLevel(value);
    filterMembers(searchTerm, value, goal);
  };

  const handleGoalChange = (e: Event) => {
    const value = (e.target as HTMLSelectElement).value as GoalType;
    setGoal(value);
    filterMembers(searchTerm, level, value);
  };

  const filterMembers = (search: string, selectedLevel: LevelType, selectedGoal: GoalType) => {
    const memberCards = document.querySelectorAll(".member-card");
    memberCards.forEach((card) => {
      const name = card.getAttribute("data-name") || "";
      const memberLevel = card.getAttribute("data-level") || "";
      const memberGoal = card.getAttribute("data-goal") || "";

      const matchesSearch =
        search === "" ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        memberLevel.toLowerCase().includes(search.toLowerCase()) ||
        memberGoal.toLowerCase().includes(search.toLowerCase());

      const matchesLevel = selectedLevel === "all" || memberLevel === selectedLevel;
      const matchesGoal = selectedGoal === "all" || memberGoal === selectedGoal;

      if (matchesSearch && matchesLevel && matchesGoal) {
        (card as HTMLElement).style.display = "block";
      } else {
        (card as HTMLElement).style.display = "none";
      }
    });
  };

  return (
    <div class="filters">
      <input
        class="input"
        placeholder="Search member, goal, location..."
        value={searchTerm}
        onInput={handleSearch}
      />
      <select class="input" value={level} onChange={handleLevelChange}>
        <option value="all">All levels</option>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
      <select class="input" value={goal} onChange={handleGoalChange}>
        <option value="all">All goals</option>
        <option value="crossfit">CrossFit</option>
        <option value="hyrox">HYROX</option>
        <option value="general">General fitness</option>
      </select>
    </div>
  );
}
