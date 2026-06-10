import { pgTable, index, varchar, text, timestamp, serial, boolean, foreignKey, unique, integer, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const leaveRequests = pgTable("leave_requests", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	studentId: varchar("student_id", { length: 50 }).notNull(),
	studentName: varchar("student_name", { length: 100 }).notNull(),
	classId: varchar("class_id", { length: 50 }).notNull(),
	reason: text().notNull(),
	startDate: varchar("start_date", { length: 20 }).notNull(),
	endDate: varchar("end_date", { length: 20 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	approvedBy: varchar("approved_by", { length: 100 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("leave_requests_class_id_idx").using("btree", table.classId.asc().nullsLast().op("text_ops")),
	index("leave_requests_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("leave_requests_student_id_idx").using("btree", table.studentId.asc().nullsLast().op("text_ops")),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const announcements = pgTable("announcements", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	classId: varchar("class_id", { length: 50 }).notNull(),
	title: varchar({ length: 200 }).notNull(),
	content: text().notNull(),
	author: varchar({ length: 100 }).notNull(),
	important: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("announcements_class_id_idx").using("btree", table.classId.asc().nullsLast().op("text_ops")),
	index("announcements_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const students = pgTable("students", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	username: varchar({ length: 100 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	role: varchar({ length: 20 }).default('student').notNull(),
	classId: varchar("class_id", { length: 50 }),
	className: varchar("class_name", { length: 100 }),
	studentId: varchar("student_id", { length: 50 }),
	faceRegistered: boolean("face_registered").default(false).notNull(),
	voiceRegistered: boolean("voice_registered").default(false).notNull(),
	faceDescriptor: text("face_descriptor"),
	voiceDescriptor: text("voice_descriptor"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("students_class_id_idx").using("btree", table.classId.asc().nullsLast().op("text_ops")),
	index("students_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("students_username_idx").using("btree", table.username.asc().nullsLast().op("text_ops")),
	foreignKey({
				columns: [table.classId],
				foreignColumns: [classes.id],
				name: "students_class_id_classes_id_fk"
			}),
	unique("students_username_unique").on(table.username),
]);

export const timetable = pgTable("timetable", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	classId: varchar("class_id", { length: 50 }).notNull(),
	dayOfWeek: integer("day_of_week").notNull(),
	period: integer().notNull(),
	subject: varchar({ length: 100 }).notNull(),
	teacher: varchar({ length: 100 }).notNull(),
}, (table) => [
	index("timetable_class_day_idx").using("btree", table.classId.asc().nullsLast().op("int4_ops"), table.dayOfWeek.asc().nullsLast().op("int4_ops")),
	index("timetable_class_id_idx").using("btree", table.classId.asc().nullsLast().op("text_ops")),
]);

export const loginLogs = pgTable("login_logs", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	username: varchar({ length: 100 }).notNull(),
	action: varchar({ length: 30 }).notNull(),
	device: varchar({ length: 50 }),
	detail: varchar({ length: 255 }),
	success: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("login_logs_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("login_logs_username_idx").using("btree", table.username.asc().nullsLast().op("text_ops")),
]);

export const attendanceRecords = pgTable("attendance_records", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	studentId: varchar("student_id", { length: 50 }).notNull(),
	studentName: varchar("student_name", { length: 100 }).notNull(),
	classId: varchar("class_id", { length: 50 }).notNull(),
	type: varchar({ length: 30 }).notNull(),
	method: varchar({ length: 20 }).default('face').notNull(),
	verified: boolean().default(true).notNull(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	className: varchar("class_name"),
}, (table) => [
	index("attendance_records_class_id_idx").using("btree", table.classId.asc().nullsLast().op("text_ops")),
	index("attendance_records_class_timestamp_idx").using("btree", table.classId.asc().nullsLast().op("text_ops"), table.timestamp.asc().nullsLast().op("timestamptz_ops")),
	index("attendance_records_student_id_idx").using("btree", table.studentId.asc().nullsLast().op("text_ops")),
	index("attendance_records_timestamp_idx").using("btree", table.timestamp.asc().nullsLast().op("timestamptz_ops")),
]);

export const classes = pgTable("classes", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	teacherName: varchar("teacher_name", { length: 100 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("classes_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
]);

// ===== 新增云端同步表 =====

// 消息表
export const messages = pgTable("messages", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	from_id: varchar({ length: 50 }).notNull(),
	to_id: varchar({ length: 50 }).notNull(),
	from_name: varchar({ length: 100 }).notNull(),
	to_name: varchar({ length: 100 }).notNull(),
	content: text().notNull(),
	type: varchar({ length: 20 }).default('chat').notNull(),
	read: boolean().default(false).notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("messages_from_id_idx").on(table.from_id),
	index("messages_to_id_idx").on(table.to_id),
	index("messages_created_at_idx").on(table.created_at),
]);

// 座位表
export const seatLayouts = pgTable("seat_layouts", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	class_id: varchar("class_id", { length: 50 }).notNull(),
	rows: integer().notNull().default(6),
	cols: integer().notNull().default(8),
	seats: text().notNull(), // JSON string of SeatAssignment[]
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("seat_layouts_class_id_idx").on(table.class_id),
]);

// 值日安排表
export const dutySchedules = pgTable("duty_schedules", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	class_id: varchar("class_id", { length: 50 }).notNull(),
	student_id: varchar("student_id", { length: 50 }).notNull(),
	student_name: varchar("student_name", { length: 100 }).notNull(),
	day_of_week: integer("day_of_week").notNull(), // 1-7
	week_start: varchar("week_start", { length: 20 }).notNull(), // ISO date of Monday
	note: text(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("duty_schedules_class_id_idx").on(table.class_id),
	index("duty_schedules_class_week_idx").on(table.class_id, table.week_start),
]);

// 课堂表现评分表
export const classPerformances = pgTable("class_performances", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	class_id: varchar("class_id", { length: 50 }).notNull(),
	student_id: varchar("student_id", { length: 50 }).notNull(),
	student_name: varchar("student_name", { length: 100 }).notNull(),
	category: varchar({ length: 50 }).notNull(), // participation/homework/discipline/other
	score: integer().notNull(), // 1-5
	note: text(),
	date: varchar({ length: 20 }).notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("class_performances_class_id_idx").on(table.class_id),
	index("class_performances_student_id_idx").on(table.student_id),
	index("class_performances_date_idx").on(table.date),
]);

// 成绩表
export const grades = pgTable("grades", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	class_id: varchar("class_id", { length: 50 }).notNull(),
	student_id: varchar("student_id", { length: 50 }).notNull(),
	student_name: varchar("student_name", { length: 100 }).notNull(),
	subject: varchar({ length: 50 }).notNull(),
	score: numeric("score", { precision: 5, scale: 2 }).notNull(),
	exam_date: varchar("exam_date", { length: 20 }).notNull(),
	exam_name: varchar("exam_name", { length: 100 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("grades_class_id_idx").on(table.class_id),
	index("grades_student_id_idx").on(table.student_id),
	index("grades_exam_date_idx").on(table.exam_date),
]);

// 家长表
export const parents = pgTable("parents", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	username: varchar({ length: 100 }).notNull().unique(),
	password: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	role: varchar({ length: 20 }).default('parent').notNull(),
	child_id: varchar("child_id", { length: 50 }),
	child_name: varchar("child_name", { length: 100 }),
	children_ids: text("children_ids"), // JSON string of string[]
	phone: varchar({ length: 20 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("parents_username_idx").on(table.username),
	index("parents_child_id_idx").on(table.child_id),
]);

// 通知表
export const notifications = pgTable("notifications", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	user_id: varchar("user_id", { length: 50 }).notNull(),
	title: varchar({ length: 200 }).notNull(),
	message: text().notNull(),
	type: varchar({ length: 30 }).notNull(), // attendance/grade/leave/announcement/system
	read: boolean().default(false).notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("notifications_user_id_idx").on(table.user_id),
	index("notifications_user_read_idx").on(table.user_id, table.read),
]);
