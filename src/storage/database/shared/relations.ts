import { relations } from "drizzle-orm/relations";
import { classes, students } from "./schema";

export const studentsRelations = relations(students, ({one}) => ({
	class: one(classes, {
		fields: [students.classId],
		references: [classes.id]
	}),
}));

export const classesRelations = relations(classes, ({many}) => ({
	students: many(students),
}));