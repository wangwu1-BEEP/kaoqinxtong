'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, Trash2, BarChart3, TrendingUp, Users, Award } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getGrades,
  addGrade,
  deleteGrade,
  getStudents,
  addNotification,
  getParents,
} from '@/lib/sharedData';
import type { GradeRecord } from '@/types/attendance';

type GradeWithStudentName = GradeRecord;

export default function GradeManagementPanel() {
  const [grades, setGrades] = useState<GradeWithStudentName[]>(() => {
    const g = getGrades();
    return g.map(item => ({
      ...item,
      studentName: item.studentName || item.studentId,
    }));
  });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string>('');
  const [showChart, setShowChart] = useState(false);

  const refreshGrades = useCallback(() => {
    const g = getGrades();
    setGrades(g.map(item => ({
      ...item,
      studentName: item.studentName || item.studentId,
    })));
  }, []);

  const handleImportExcel = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

        const students = getStudents();
        let imported = 0;
        let skipped = 0;

        jsonData.forEach((row) => {
          const studentName = row['姓名'] || row['学生姓名'] || row['name'] || row['Name'] || '';
          const subject = row['科目'] || row['学科'] || row['subject'] || row['Subject'] || '';
          const score = parseFloat(row['成绩'] || row['分数'] || row['score'] || row['Score'] || '0');
          const examName = row['考试名称'] || row['考试'] || row['exam'] || row['Exam'] || '期中考试';
          const date = row['日期'] || row['date'] || new Date().toISOString().split('T')[0];

          if (!studentName || !subject || isNaN(score)) {
            skipped++;
            return;
          }

          const student = students.find(s => s.name === studentName);
          if (!student) {
            skipped++;
            return;
          }

          addGrade({
            studentId: student.id,
            studentName: student.name,
            classId: student.classId,
            subject,
            score,
            fullScore: 100,
            examName,
            date,
            createdAt: new Date().toISOString(),
          });

          addNotification({
            userId: student.id,
            title: '新成绩发布',
            message: `${examName} - ${subject}: ${score}分`,
            type: 'grade',
            read: false,
          });

          // 推送通知给家长
          const parents = getParents();
          const parentOfStudent = parents.find(p =>
            p.childrenIds?.includes(student.id)
          );
          if (parentOfStudent) {
            addNotification({
              userId: parentOfStudent.id,
              title: '孩子成绩发布',
              message: `${student.name} - ${examName} - ${subject}: ${score}分`,
              type: 'grade',
              read: false,
            });
          }

          imported++;
        });

        setImportResult(`成功导入 ${imported} 条成绩${skipped > 0 ? `，跳过 ${skipped} 条（学生不存在或数据不完整）` : ''}`);
        refreshGrades();
      } catch (err) {
        setImportResult(`导入失败: ${err instanceof Error ? err.message : '未知错误'}`);
      } finally {
        setImporting(false);
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  }, [refreshGrades]);

  const handleDelete = useCallback((gradeId: string) => {
    deleteGrade(gradeId);
    refreshGrades();
  }, [refreshGrades]);

  // 按科目统计平均分
  const subjectStats = grades.reduce<Record<string, { total: number; count: number; max: number; min: number }>>((acc, g) => {
    if (!acc[g.subject]) {
      acc[g.subject] = { total: 0, count: 0, max: 0, min: 100 };
    }
    acc[g.subject].total += g.score;
    acc[g.subject].count += 1;
    acc[g.subject].max = Math.max(acc[g.subject].max, g.score);
    acc[g.subject].min = Math.min(acc[g.subject].min, g.score);
    return acc;
  }, {});

  // 统计卡片数据
  const totalStudents = new Set(grades.map(g => g.studentId)).size;
  const avgScore = grades.length > 0 ? (grades.reduce((sum, g) => sum + g.score, 0) / grades.length).toFixed(1) : '0';
  const excellentRate = grades.length > 0 ? ((grades.filter(g => g.score >= 90).length / grades.length) * 100).toFixed(0) : '0';

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="shadow-xl border-0 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">成绩管理</h2>
                <p className="text-sm text-gray-500">导入Excel成绩，自动推送给学生</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowChart(!showChart)}
                className="rounded-xl border-gray-200 hover:border-emerald-300 hover:text-emerald-600 transition-all duration-300"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {showChart ? '隐藏统计' : '查看统计'}
              </Button>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImportExcel}
                  className="hidden"
                  disabled={importing}
                />
                <Button
                  disabled={importing}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                  asChild
                >
                  <span>
                    {importing ? <span className="h-4 w-4 mr-2 animate-pulse">⏳</span> : <Upload className="h-4 w-4 mr-2" />}
                    {importing ? '导入中...' : '导入Excel'}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {importResult && (
            <div className={`mt-4 p-3 rounded-xl text-sm font-medium ${
              importResult.includes('失败')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {importResult}
            </div>
          )}

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            Excel格式要求：第一行为表头，包含「姓名」「科目」「成绩」列，可选「考试名称」「日期」列
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalStudents}</p>
              <p className="text-xs text-gray-500">学生数</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-md">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{avgScore}</p>
              <p className="text-xs text-gray-500">平均分</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg border-0 bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-md">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{excellentRate}%</p>
              <p className="text-xs text-gray-500">优秀率</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Statistics */}
      {showChart && Object.keys(subjectStats).length > 0 && (
        <Card className="shadow-lg border-0 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              科目统计
            </h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-gray-100">
                    <TableHead className="font-semibold text-gray-600">科目</TableHead>
                    <TableHead className="font-semibold text-gray-600">平均分</TableHead>
                    <TableHead className="font-semibold text-gray-600">最高分</TableHead>
                    <TableHead className="font-semibold text-gray-600">最低分</TableHead>
                    <TableHead className="font-semibold text-gray-600">人数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(subjectStats).map(([subject, stat]) => (
                    <TableRow key={subject} className="hover:bg-blue-50/50 transition-colors">
                      <TableCell className="font-medium text-gray-800">{subject}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${
                          stat.total / stat.count >= 80 ? 'text-emerald-600' :
                          stat.total / stat.count >= 60 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {(stat.total / stat.count).toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <TrendingUp className="w-3 h-3" />{stat.max}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-500 font-medium">{stat.min}</span>
                      </TableCell>
                      <TableCell>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-md text-sm text-gray-600">{stat.count}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Grades Table */}
      <Card className="shadow-lg border-0 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">全部成绩</h3>
          {grades.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-10 h-10 text-emerald-300" />
              </div>
              <p className="text-gray-500 text-lg font-medium">暂无成绩数据</p>
              <p className="text-gray-400 text-sm mt-1">点击上方按钮导入Excel成绩文件</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-gray-100">
                    <TableHead className="font-semibold text-gray-600">学生</TableHead>
                    <TableHead className="font-semibold text-gray-600">科目</TableHead>
                    <TableHead className="font-semibold text-gray-600">成绩</TableHead>
                    <TableHead className="font-semibold text-gray-600">考试</TableHead>
                    <TableHead className="font-semibold text-gray-600">日期</TableHead>
                    <TableHead className="font-semibold text-gray-600 w-16">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map((g) => (
                    <TableRow key={g.id} className="hover:bg-emerald-50/50 transition-colors">
                      <TableCell className="font-medium text-gray-800">{g.studentName}</TableCell>
                      <TableCell>
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-sm">{g.subject}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold text-lg ${
                          g.score >= 90 ? 'text-emerald-600' :
                          g.score >= 60 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {g.score}
                        </span>
                        <span className="text-gray-400 text-sm ml-1">/ {g.fullScore}</span>
                      </TableCell>
                      <TableCell className="text-gray-600">{g.examName}</TableCell>
                      <TableCell className="text-gray-400 text-sm">{g.date}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(g.id)}
                          className="hover:bg-red-50 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
