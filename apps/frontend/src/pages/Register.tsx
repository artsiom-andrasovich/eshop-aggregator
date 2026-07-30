import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@eshop/shared';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

const Register = React.memo(function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      const res = await apiClient.post('/auth/register', data);
      setAuth(res.data.user, res.data.accessToken);
      navigate('/');
    } catch (err: any) {
      setError('root', { message: err.response?.data?.message || 'Registration failed' });
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Register</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input {...register('email')} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Display Name</label>
          <input {...register('displayName')} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
          {errors.displayName && <p className="text-red-500 text-sm mt-1">{errors.displayName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input type="password" {...register('password')} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
        </div>

        {errors.root && <p className="text-red-500 text-sm">{errors.root.message}</p>}

        <button disabled={isSubmitting} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Loading...' : 'Register'}
        </button>
      </form>
      <p className="mt-4 text-sm text-center">
        Already have an account? <Link to="/login" className="text-blue-500 hover:underline">Login</Link>
      </p>
    </div>
  );
});

export default Register;
