import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@eshop/shared';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

const Login = React.memo(function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await apiClient.post('/auth/login', data);
      setAuth(res.data.user, res.data.accessToken);
      navigate('/');
    } catch (err: any) {
      setError('root', { message: err.response?.data?.message || 'Login failed' });
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Login</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input {...register('email')} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input type="password" {...register('password')} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
        </div>

        {errors.root && <p className="text-red-500 text-sm">{errors.root.message}</p>}

        <button disabled={isSubmitting} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Loading...' : 'Login'}
        </button>
      </form>
      <p className="mt-4 text-sm text-center">
        Don't have an account? <Link to="/register" className="text-blue-500 hover:underline">Register</Link>
      </p>
    </div>
  );
});

export default Login;
