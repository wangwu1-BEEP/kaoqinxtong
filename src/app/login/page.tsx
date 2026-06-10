'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getClasses, getStudents, saveStudents, getParents, saveParents } from '@/lib/sharedData';
import { syncOnLogin, upsertStudentSynced, getClassesSynced } from '@/lib/syncUtils';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);

  // 粒子数据仅在客户端生成，避免 SSR hydration 不匹配
  const [particles, setParticles] = useState<Array<{ size: number; left: number; top: number; dur: number; delay: number }>>([]);
  useEffect(() => {
    const seed = 42;
    const pseudoRandom = (i: number) => {
      const x = Math.sin(seed + i * 127.1) * 43758.5453;
      return x - Math.floor(x);
    };
    setParticles(Array.from({ length: 20 }).map((_, i) => ({
      size: 2 + pseudoRandom(i) * 4,
      left: pseudoRandom(i + 20) * 100,
      top: pseudoRandom(i + 40) * 100,
      dur: 5 + pseudoRandom(i + 60) * 10,
      delay: pseudoRandom(i + 80) * 5,
    })));
  }, []);

  const [loginData, setLoginData] = useState({ username: '', password: '', role: 'student' as 'teacher' | 'student' | 'parent', classId: '' });
  const [registerData, setRegisterData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'student' as 'teacher' | 'student' | 'parent',
    classId: '',
    childId: '',
    childName: '',
    teacherType: 'headTeacher' as 'headTeacher' | 'subjectTeacher',
    subject: '',
  });

  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    setClasses(getClasses());
    getClassesSynced().then(cloudClasses => {
      if (cloudClasses && cloudClasses.length > 0) {
        setClasses(cloudClasses as Array<{ id: string; name: string }>);
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.username || !loginData.password) return;

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    const isTeacherUsername = loginData.username.startsWith('teacher');
    const selectedRole = loginData.role || 'student';

    // 身份校验：用户名与选择的身份必须匹配
    if (isTeacherUsername && selectedRole !== 'teacher') {
      setLoginError('该账号为教师账号，请选择教师身份登录');
      setIsLoading(false);
      return;
    }
    if (!isTeacherUsername && selectedRole === 'teacher') {
      setLoginError('该账号不是教师账号，请选择正确的身份');
      setIsLoading(false);
      return;
    }

    // 家长身份校验：选择家长身份时，需要验证家长账号
    if (selectedRole === 'parent') {
      const parents = getParents();
      const savedParent = parents.find(p => p.username === loginData.username);
      if (!savedParent) {
        setLoginError('未找到该家长账号，请先注册');
        setIsLoading(false);
        return;
      }
      if (savedParent.password && savedParent.password !== loginData.password) {
        setLoginError('密码错误，请重新输入');
        setIsLoading(false);
        return;
      }
    }

    // 学生身份校验：选择学生身份时，验证学生账号
    if (selectedRole === 'student') {
      const students = getStudents();
      const savedStudent = students.find(s => s.username === loginData.username);
      if (!savedStudent) {
        setLoginError('未找到该学生账号，请先注册');
        setIsLoading(false);
        return;
      }
      if (savedStudent.password && savedStudent.password !== loginData.password) {
        setLoginError('密码错误，请重新输入');
        setIsLoading(false);
        return;
      }
    }

    // 跨角色校验：选择学生身份时，不能是家长账号；选择家长身份时，不能是学生账号
    if (selectedRole === 'student') {
      const parents = getParents();
      const isParentAccount = parents.some(p => p.username === loginData.username);
      if (isParentAccount) {
        setLoginError('该账号为家长账号，请选择家长身份登录');
        setIsLoading(false);
        return;
      }
    }
    if (selectedRole === 'parent') {
      const students = getStudents();
      const isStudentAccount = students.some(s => s.username === loginData.username);
      if (isStudentAccount) {
        setLoginError('该账号为学生账号，请选择学生身份登录');
        setIsLoading(false);
        return;
      }
    }

    setLoginError('');

    const isParent = selectedRole === 'parent';

    let userInfo: Record<string, unknown> = {
      id: `user-${Date.now()}`,
      username: loginData.username,
      name: isTeacherUsername ? '张老师' : '李明',
      role: isTeacherUsername ? 'teacher' : (isParent ? 'parent' : 'student'),
      classId: isTeacherUsername ? 'class-001' : 'class-001',
      className: isTeacherUsername ? '教师班级' : '初三（1）班',
      password: loginData.password,
    };

    if (isParent) {
      // 先从云端同步最新数据，确保本地有最新的家长信息
      try { await syncOnLogin(); } catch (e) { console.warn('syncOnLogin failed:', e); }
      const parents = getParents();
      const savedParent = parents.find(p => p.username === loginData.username);
      if (savedParent) {
        if (savedParent.password && savedParent.password !== loginData.password) {
          setIsLoading(false);
          return;
        }
        userInfo = {
          ...userInfo,
          id: savedParent.id,
          name: savedParent.name,
          childId: savedParent.childId,
          childName: savedParent.childName,
          classId: savedParent.classId,
          className: savedParent.className,
        };
      } else {
        const parentId = `parent-${Date.now()}`;
        const newParent = {
          id: parentId,
          username: loginData.username,
          password: loginData.password,
          name: loginData.username,
          role: 'parent' as const,
          childId: '',
          childName: '',
          classId: loginData.classId || 'class-001',
          className: '',
        };
        parents.push(newParent);
        saveParents(parents);
        userInfo.id = parentId;
        userInfo.classId = loginData.classId || 'class-001';
      }
      localStorage.setItem('user', JSON.stringify(userInfo));
      router.push('/parent');
      setIsLoading(false);
      return;
    }

    if (!isTeacherUsername) {
      const students = getStudents();
      const savedStudent = students.find((s) => s.username === loginData.username);
      if (savedStudent) {
        if (savedStudent.password && savedStudent.password !== loginData.password) {
          setIsLoading(false);
          return;
        }
        const classInfo = classes.find((c) => c.id === savedStudent.classId);
        userInfo = {
          ...userInfo,
          id: savedStudent.id,
          name: savedStudent.name,
          classId: savedStudent.classId,
          className: classInfo?.name || savedStudent.className || '未分配班级',
          studentId: savedStudent.studentId,
          faceRegistered: savedStudent.faceRegistered,
          voiceRegistered: savedStudent.voiceRegistered,
        };
      } else {
        const nameFromUsername = loginData.username;
        userInfo.name = nameFromUsername;
        const studentsList = getStudents();
        const newStudentId = `stu-${Date.now()}`;
        const newStudent = {
          id: newStudentId,
          username: loginData.username,
          password: loginData.password,
          name: nameFromUsername,
          role: 'student' as const,
          classId: 'class-001',
          className: '默认班级',
          faceRegistered: false,
          voiceRegistered: false,
        };
        studentsList.push(newStudent);
        saveStudents(studentsList);
        userInfo.id = newStudentId;
      }
    }

    localStorage.setItem('user', JSON.stringify(userInfo));

    try { await syncOnLogin(); } catch (e) { console.warn('syncOnLogin failed:', e); }

    if (!isTeacherUsername) {
      const syncedStudents = getStudents();
      const stillExists = syncedStudents.find((s) => s.username === loginData.username);
      if (!stillExists) {
        localStorage.removeItem('user');
        setIsLoading(false);
        alert('该账号已被教师删除，请联系教师重新注册。');
        return;
      }
      const classInfo = classes.find((c) => c.id === stillExists.classId);
      userInfo = {
        ...userInfo,
        id: stillExists.id,
        name: stillExists.name,
        classId: stillExists.classId,
        className: classInfo?.name || stillExists.className || '未分配班级',
        studentId: stillExists.studentId,
        faceRegistered: stillExists.faceRegistered,
        voiceRegistered: stillExists.voiceRegistered,
      };
      localStorage.setItem('user', JSON.stringify(userInfo));
    }

    const logs = JSON.parse(localStorage.getItem('login_logs') || '[]');
    logs.unshift({
      id: `log-${Date.now()}`,
      username: loginData.username,
      action: 'login',
      device: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
      timestamp: new Date().toISOString(),
      success: true,
    });
    localStorage.setItem('login_logs', JSON.stringify(logs.slice(0, 100)));

    if (isTeacherUsername) {
      router.push('/teacher');
    } else {
      const students = getStudents();
      const student = students.find((s) => s.username === loginData.username);
      if (student && (!student.faceRegistered || !student.voiceRegistered)) {
        localStorage.setItem('pending_registration', JSON.stringify({
          username: loginData.username,
          userId: student.id,
          step: !student.faceRegistered ? 'face' : 'voice',
        }));
        router.push('/registration');
      } else {
        router.push('/student');
      }
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData.username || !registerData.password || !registerData.name) return;

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    const selectedClass = classes.find((c) => c.id === registerData.classId);
    const newUserId = `user-${Date.now()}`;

    if (registerData.role === 'parent') {
      const parents = getParents();
      const selClass = classes.find((c) => c.id === registerData.classId);
      const newParent = {
        id: newUserId,
        username: registerData.username,
        password: registerData.password,
        name: registerData.name,
        role: 'parent' as const,
        childId: registerData.childId || '',
        childName: registerData.childName || '',
        classId: registerData.classId || 'class-001',
        className: selClass?.name || '默认班级',
      };
      parents.push(newParent);
      saveParents(parents);

      // 先将新家长推送到云端，再拉取云端数据（避免被云端数据覆盖）
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upsert_parent',
            data: {
              id: newParent.id,
              username: newParent.username,
              password: newParent.password,
              name: newParent.name,
              child_id: newParent.childId,
              child_name: newParent.childName,
              class_id: newParent.classId,
              phone: '',
            },
          }),
        });
      } catch (e) { console.warn('push parent to cloud failed:', e); }

      try { await syncOnLogin(); } catch (e) { console.warn('syncOnLogin failed:', e); }

      const userInfo = {
        id: newParent.id,
        username: registerData.username,
        name: registerData.name,
        role: 'parent',
        childId: registerData.childId || '',
        childName: registerData.childName || '',
        classId: registerData.classId || 'class-001',
        className: selClass?.name || '默认班级',
      };
      localStorage.setItem('user', JSON.stringify(userInfo));
      router.push('/parent');
      setIsLoading(false);
      return;
    }

    if (registerData.role === 'student') {
      const students = getStudents();
      const newStudent = {
        id: newUserId,
        username: registerData.username,
        password: registerData.password,
        name: registerData.name,
        role: 'student' as const,
        classId: registerData.classId || 'class-001',
        className: selectedClass?.name || '默认班级',
        faceRegistered: false,
        voiceRegistered: false,
      };
      students.push(newStudent);
      saveStudents(students);

      try {
        if (registerData.classId && selectedClass) {
          await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'upsert_class',
              data: {
                id: registerData.classId,
                name: selectedClass.name,
                teacher_name: (selectedClass as Record<string, unknown>).teacherName as string || '教师',
              },
            }),
          });
        }
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upsert_student',
            data: {
              id: newUserId,
              username: registerData.username,
              password: registerData.password,
              name: registerData.name,
              role: 'student',
              class_id: registerData.classId || 'class-001',
              class_name: selectedClass?.name || '默认班级',
              face_registered: false,
              voice_registered: false,
            },
          }),
        });
      } catch (err) {
        console.error('[handleRegister] sync failed:', err);
      }
    }

    const userInfo = {
      id: newUserId,
      username: registerData.username,
      name: registerData.name,
      role: registerData.role,
      classId: registerData.role === 'student' ? registerData.classId : undefined,
      className: selectedClass?.name || undefined,
      teacherType: registerData.role === 'teacher' ? registerData.teacherType : undefined,
      subject: registerData.role === 'teacher' ? registerData.subject : undefined,
    };

    localStorage.setItem('user', JSON.stringify(userInfo));

    if (registerData.role === 'teacher') {
      router.push('/teacher');
    } else {
      localStorage.setItem('pending_registration', JSON.stringify({
        username: registerData.username,
        userId: userInfo.id,
        step: 'face',
      }));
      router.push('/registration');
    }
    setIsLoading(false);
  };

  const roleConfig = {
    teacher: { label: '教师', icon: '👨‍🏫', color: 'from-blue-500 to-cyan-400' },
    student: { label: '学生', icon: '🎓', color: 'from-violet-500 to-purple-400' },
    parent: { label: '家长', icon: '👨‍👩‍👧', color: 'from-emerald-500 to-teal-400' },
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#0a0a1a' }}>
      {/* 动态极光背景 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-30 blur-[120px]"
          style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', animation: 'aurora1 8s ease-in-out infinite' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[100px]"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', animation: 'aurora2 10s ease-in-out infinite' }} />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full opacity-15 blur-[80px]"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', animation: 'aurora3 12s ease-in-out infinite' }} />
        {/* 网格线 */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        {/* 浮动粒子 */}
        {particles.map((p, i) => (
          <div key={i} className="absolute rounded-full bg-white/20"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: `${p.left}%`,
              top: `${p.top}%`,
              animation: `float ${p.dur}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }} />
        ))}
      </div>

      <style>{`
        @keyframes aurora1 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(5%, 10%) scale(1.1); } }
        @keyframes aurora2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-8%, -5%) scale(1.15); } }
        @keyframes aurora3 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(3%, -8%) scale(1.05); } }
        @keyframes float { 0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; } 50% { transform: translateY(-20px) scale(1.5); opacity: 0.8; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes pulse-ring { 0% { transform: scale(0.9); opacity: 0.8; } 100% { transform: scale(1.4); opacity: 0; } }
      `}</style>

      {/* 主卡片 */}
      <div className="w-full max-w-sm relative z-10">
        {/* Logo 区域 */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            {/* 脉冲光环 */}
            <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', animation: 'pulse-ring 2s ease-out infinite' }} />
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl backdrop-blur-xl border border-white/20"
              style={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.3), rgba(118,75,162,0.3))' }}>
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold mt-6 mb-2"
            style={{ backgroundImage: 'linear-gradient(135deg, #fff 0%, #c4b5fd 50%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% auto', animation: 'shimmer 3s linear infinite' }}>
            智能考勤系统
          </h1>
          <p className="text-sm text-white/40 tracking-[0.3em]">SMART ATTENDANCE</p>
        </div>

        {/* 毛玻璃表单卡片 */}
        <div className="rounded-3xl p-6 shadow-2xl backdrop-blur-xl border border-white/10"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))' }}>
          {/* Tab 切换 */}
          <div className="flex rounded-2xl p-1 mb-6 relative" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="absolute top-1 bottom-1 rounded-xl transition-all duration-300 ease-out"
              style={{
                width: 'calc(50% - 4px)',
                left: isLogin ? '4px' : 'calc(50%)',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                boxShadow: '0 4px 15px rgba(102,126,234,0.4)',
              }} />
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={cn('flex-1 py-2.5 text-sm font-medium rounded-xl transition-all relative z-10', isLogin ? 'text-white' : 'text-white/50 hover:text-white/70')}>
              登录
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={cn('flex-1 py-2.5 text-sm font-medium rounded-xl transition-all relative z-10', !isLogin ? 'text-white' : 'text-white/50 hover:text-white/70')}>
              注册
            </button>
          </div>

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* 身份选择 */}
              <div>
                <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">身份选择</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['teacher', 'student', 'parent'] as const).map((r) => (
                    <button key={r} type="button"
                      onClick={() => setLoginData({ ...loginData, role: r })}
                      className={cn('py-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden',
                        loginData.role === r ? 'text-white' : 'text-white/50 hover:text-white/70 border border-white/10')}>
                      {loginData.role === r && (
                        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${r === 'teacher' ? '#3b82f6, #06b6d4' : r === 'student' ? '#8b5cf6, #a855f7' : '#10b981, #06b6d4'})`, boxShadow: `0 4px 15px ${r === 'teacher' ? 'rgba(59,130,246,0.3)' : r === 'student' ? 'rgba(139,92,246,0.3)' : 'rgba(16,185,129,0.3)'}` }} />
                      )}
                      <span className="relative z-10 flex flex-col items-center gap-1">
                        <span className="text-lg">{roleConfig[r].icon}</span>
                        <span>{roleConfig[r].label}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 输入框 */}
              <div>
                <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">用户名</label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <input type="text" placeholder="请输入用户名"
                    value={loginData.username} onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/20 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all text-sm backdrop-blur-sm"
                    required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">密码</label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <input type="password" placeholder="请输入密码"
                    value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/20 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all text-sm backdrop-blur-sm"
                    required />
                </div>
              </div>

              {/* 测试账号 */}
              <div className="p-3 rounded-xl border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs text-white/30">
                  <span className="text-white/50 font-medium">测试账号</span>
                  <br />教师: teacher001 | 学生: student001
                </p>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center">
                  {loginError}
                </div>
              )}
              <button type="submit" disabled={isLoading}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 relative overflow-hidden group"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(135deg, #7c93f5 0%, #8b5fb5 100%)' }} />
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2 relative z-10">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    登录中...
                  </span>
                ) : <span className="relative z-10">登 录</span>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">姓名</label>
                <input type="text" placeholder="请输入真实姓名"
                  value={registerData.name} onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/20 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all text-sm backdrop-blur-sm"
                  required />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">用户名</label>
                <input type="text" placeholder="设置用户名"
                  value={registerData.username} onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/20 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all text-sm backdrop-blur-sm"
                  required />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">密码</label>
                <input type="password" placeholder="设置密码"
                  value={registerData.password} onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/20 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all text-sm backdrop-blur-sm"
                  required />
              </div>

              {/* 角色选择 */}
              <div>
                <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">身份</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['teacher', 'student', 'parent'] as const).map((r) => (
                    <button key={r} type="button"
                      onClick={() => setRegisterData({ ...registerData, role: r })}
                      className={cn('py-3 px-2 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden border',
                        registerData.role === r ? 'text-white border-transparent' : 'border-white/10 text-white/50 hover:text-white/70')}>
                      {registerData.role === r && (
                        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${r === 'teacher' ? '#3b82f6, #06b6d4' : r === 'student' ? '#8b5cf6, #a855f7' : '#10b981, #06b6d4'})` }} />
                      )}
                      <span className="relative z-10 flex flex-col items-center gap-1">
                        <span className="text-lg">{roleConfig[r].icon}</span>
                        <span>{roleConfig[r].label}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 教师类型选择 */}
              {registerData.role === 'teacher' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">教师类型</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([['headTeacher', '班主任', '🎓'], ['subjectTeacher', '任课教师', '📚']] as const).map(([type, label, icon]) => (
                        <button key={type} type="button"
                          onClick={() => setRegisterData({ ...registerData, teacherType: type as 'headTeacher' | 'subjectTeacher' })}
                          className={cn('py-3 px-2 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden border',
                            registerData.teacherType === type ? 'text-white border-transparent' : 'border-white/10 text-white/50 hover:text-white/70')}>
                          {registerData.teacherType === type && (
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500" />
                          )}
                          <span className="relative z-10 flex items-center gap-1.5 justify-center">
                            <span>{icon}</span>
                            <span>{label}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">备注（任教学科等）</label>
                    <input type="text" placeholder="如：语文、数学、英语..."
                      value={registerData.subject || ''}
                      onChange={(e) => setRegisterData({ ...registerData, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-blue-400/50 transition-all text-sm" />
                  </div>
                </>
              )}

              {/* 班级选择 */}
              {(registerData.role === 'student' || registerData.role === 'parent') && (
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">班级</label>
                  <select value={registerData.classId}
                    onChange={(e) => setRegisterData({ ...registerData, classId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all text-sm backdrop-blur-sm appearance-none"
                    required>
                    <option value="" className="bg-gray-900">请选择班级</option>
                    {classes.map((cls) => (<option key={cls.id} value={cls.id} className="bg-gray-900">{cls.name}</option>))}
                  </select>
                </div>
              )}

              {/* 关联学生 */}
              {registerData.role === 'parent' && registerData.classId && (
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">关联学生</label>
                  <select value={registerData.childId}
                    onChange={(e) => {
                      const allStudents = getStudents();
                      const sel = allStudents.find((s) => s.id === e.target.value);
                      setRegisterData({ ...registerData, childId: e.target.value, childName: sel?.name || '' });
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all text-sm backdrop-blur-sm appearance-none"
                    required>
                    <option value="" className="bg-gray-900">请选择您的孩子</option>
                    {getStudents().filter((s) => s.classId === registerData.classId).map((s) => (
                      <option key={s.id} value={s.id} className="bg-gray-900">{s.name} ({s.studentId})</option>
                    ))}
                  </select>
                </div>
              )}

              <button type="submit" disabled={isLoading}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 relative overflow-hidden group"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(135deg, #7c93f5 0%, #8b5fb5 100%)' }} />
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2 relative z-10">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    注册中...
                  </span>
                ) : <span className="relative z-10">注 册</span>}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-8 tracking-wider">SMART ATTENDANCE SYSTEM v2.0</p>
      </div>
    </div>
  );
}
