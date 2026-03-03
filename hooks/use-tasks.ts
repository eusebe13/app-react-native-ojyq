/**
 * useTasks — real-time Firestore listener for the tasks collection.
 *
 * Returns:
 *  - allTasks:  every task (for admins)
 *  - myTasks:   tasks assigned to the current user by uid or by their role
 *  - loading:   initial load flag
 */

import { db } from "@/firebaseConfig";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: Date;
  assigneeType: "user" | "role";
  assigneeId: string;    // uid when type=user, role name when type=role
  assigneeName: string;  // display name
  status: "todo" | "done";
  priority: "low" | "medium" | "high";
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  completedAt?: Date;
}

function taskFromDoc(d: any): Task {
  const data = d.data();
  return {
    id: d.id,
    title: data.title ?? "",
    description: data.description ?? "",
    deadline: data.deadline?.toDate() ?? new Date(),
    assigneeType: data.assigneeType ?? "user",
    assigneeId: data.assigneeId ?? "",
    assigneeName: data.assigneeName ?? "",
    status: data.status ?? "todo",
    priority: data.priority ?? "medium",
    createdBy: data.createdBy ?? "",
    createdByName: data.createdByName ?? "",
    createdAt: data.createdAt?.toDate() ?? new Date(),
    completedAt: data.completedAt?.toDate(),
  };
}

export function useTasks(userId: string, userRole: string) {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("deadline", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAllTasks(snap.docs.map(taskFromDoc));
        setLoading(false);
      },
      (err) => {
        console.error("[useTasks]", err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  // Filter client-side: tasks assigned directly to this user, or to their role
  const myTasks = allTasks.filter(
    (t) =>
      (t.assigneeType === "user" && t.assigneeId === userId) ||
      (t.assigneeType === "role" && t.assigneeId === userRole)
  );

  return { myTasks, allTasks, loading };
}
