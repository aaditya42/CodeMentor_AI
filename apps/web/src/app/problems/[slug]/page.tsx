"use client";

import { useEffect, useState } from "react";
import { Panel, Group } from "react-resizable-panels";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { ProblemPanel } from "@/components/workspace/problem-panel";
import { CodeEditor } from "@/components/workspace/code-editor";
import { HintSidebar } from "@/components/workspace/hint-sidebar";
import { ConsolePanel } from "@/components/workspace/console-panel";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { PanelHandle } from "@/components/workspace/panel-handle";

// Demo problem data for when the backend isn't connected
const DEMO_PROBLEM = {
  id: "demo-1",
  title: "Two Sum",
  slug: "two-sum",
  description: `Given an array of integers **nums** and an integer **target**, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\nYou can return the answer in any order.`,
  difficulty: "EASY" as const,
  topics: ["Arrays", "Hash Table"],
  companies: ["Amazon", "Google", "Meta"],
  constraints: "2 ≤ nums.length ≤ 10⁴\n-10⁹ ≤ nums[i] ≤ 10⁹\n-10⁹ ≤ target ≤ 10⁹\nOnly one valid answer exists.",
  examples: [
    { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
    { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
    { input: "nums = [3,3], target = 6", output: "[0,1]" },
  ],
  starterCode: {
    PYTHON: 'def twoSum(nums: list[int], target: int) -> list[int]:\n    # Write your solution here\n    pass\n',
    CPP: '#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your solution here\n        return {};\n    }\n};\n',
    JAVA: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        return new int[]{};\n    }\n}\n',
    JAVASCRIPT: 'function twoSum(nums, target) {\n    // Write your solution here\n    return [];\n}\n',
  } as Record<string, string>,
  testCases: [
    { id: "tc-1", input: "[2,7,11,15]\\n9", expected: "[0,1]", isHidden: false },
    { id: "tc-2", input: "[3,2,4]\\n6", expected: "[1,2]", isHidden: false },
    { id: "tc-3", input: "[3,3]\\n6", expected: "[0,1]", isHidden: false },
  ],
};

export default function WorkspacePage() {
  const { language, setCode, setProblem } = useWorkspaceStore();
  const [problem] = useState(DEMO_PROBLEM);

  useEffect(() => {
    setProblem(problem.id, problem.slug);
    const starter = problem.starterCode[language] || problem.starterCode.PYTHON;

    setCode(starter);
  }, [problem.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen flex-col bg-[hsl(var(--background))]">
      {/* Top bar */}
      <WorkspaceHeader problem={problem} />

      {/* Main workspace */}
      <div className="flex-1 overflow-hidden">
        <Group orientation="horizontal" className="h-full">
          {/* Left: Problem + Editor stacked */}
          <Panel defaultSize={65} minSize={40}>
            <Group orientation="vertical">
              {/* Problem description */}
              <Panel defaultSize={40} minSize={20}>
                <ProblemPanel problem={problem} />
              </Panel>

              <PanelHandle direction="horizontal" />

              {/* Code editor */}
              <Panel defaultSize={40} minSize={25}>
                <CodeEditor starterCode={problem.starterCode} />
              </Panel>

              <PanelHandle direction="horizontal" />

              {/* Console */}
              <Panel defaultSize={20} minSize={10}>
                <ConsolePanel testCases={problem.testCases} />
              </Panel>
            </Group>
          </Panel>

          <PanelHandle direction="vertical" />

          {/* Right: AI Hint Sidebar */}
          <Panel defaultSize={35} minSize={25}>
            <HintSidebar problem={problem} />
          </Panel>
        </Group>
      </div>
    </div>
  );
}

