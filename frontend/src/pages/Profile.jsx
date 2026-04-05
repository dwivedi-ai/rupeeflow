import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../utils/api';
import { ArrowLeft, User, Mail, Save, Loader2, Shield, Eye, EyeOff, Settings, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState();
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm({
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm();

  // Fetch user profile data
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => authAPI.getMe(),
  });

  // Check if user is logged in with Google OAuth (no password)
  const isGoogleAuth = user?.auth_provider === 'google' || userProfile?.auth_provider === 'google';

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (profileData) => authAPI.updateProfile(profileData),
    onSuccess: (data) => {
      updateUser(data);
      queryClient.invalidateQueries(['user', 'profile']);
      toast.success('Profile updated successfully!');
    },
    onError: (error) => {
      console.error('Update profile error:', error);
      const message = error.response?.data?.error || 'Failed to update profile';
      toast.error(message);
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (passwordData) => authAPI.changePassword(passwordData),
    onSuccess: () => {
      resetPassword();
      toast.success('Password changed successfully!');
    },
    onError: (error) => {
      console.error('Change password error:', error);
      const message = error.response?.data?.error || 'Failed to change password';
      toast.error(message);
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: () => authAPI.deleteAccount(),
    onSuccess: () => {
      toast.success('Account deleted successfully');
      // Clear auth data and redirect
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('user');
      navigate('/login');
    },
    onError: (error) => {
      console.error('Delete account error:', error);
      const message = error.response?.data?.error || 'Failed to delete account';
      toast.error(message);
    },
  });

  const onProfileSubmit = (data) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data) => {
    if (data.new_password !== data.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    changePasswordMutation.mutate({
      current_password: data.current_password,
      new_password: data.new_password,
    });
  };

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
    setShowDeleteConfirmation(false);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Profile Settings</h1>
            <p className="text-sm text-gray-500">
              Manage your account settings and preferences
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Tabs */}
          <div className="card-elevated mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                    <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-6">
                      {/* Full Name */}
                      <div>
                        <label htmlFor="full_name" className="block text-sm font-semibold text-gray-700 mb-2">
                          Full Name
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            {...register('full_name', {
                              required: 'Full name is required',
                              minLength: {
                                value: 2,
                                message: 'Full name must be at least 2 characters',
                              },
                            })}
                            type="text"
                            className={`input pl-10 ${errors.full_name ? 'input-error' : ''}`}
                            placeholder="Enter your full name"
                          />
                        </div>
                        {errors.full_name && (
                          <p className="mt-2 text-sm text-red-600">{errors.full_name.message}</p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                          Email Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            {...register('email', {
                              required: 'Email is required',
                              pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: 'Invalid email address',
                              },
                            })}
                            type="email"
                            className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                            placeholder="Enter your email"
                          />
                        </div>
                        {errors.email && (
                          <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                        )}
                      </div>

                      {/* Submit Button */}
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                          className="btn btn-primary"
                        >
                          {updateProfileMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Update Profile
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  {isGoogleAuth ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Shield className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-blue-900">Google Account</h3>
                          <p className="text-sm text-blue-700">
                            You're signed in with Google. Password changes are managed through your Google account.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
                        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6">
                      {/* Current Password */}
                      <div>
                        <label htmlFor="current_password" className="block text-sm font-semibold text-gray-700 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            {...registerPassword('current_password', {
                              required: 'Current password is required',
                            })}
                            type={showCurrentPassword ? 'text' : 'password'}
                            className={`input pr-10 ${passwordErrors.current_password ? 'input-error' : ''}`}
                            placeholder="Enter current password"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-5 w-5 text-gray-400" />
                            ) : (
                              <Eye className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </div>
                        {passwordErrors.current_password && (
                          <p className="mt-2 text-sm text-red-600">{passwordErrors.current_password.message}</p>
                        )}
                      </div>

                      {/* New Password */}
                      <div>
                        <label htmlFor="new_password" className="block text-sm font-semibold text-gray-700 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            {...registerPassword('new_password', {
                              required: 'New password is required',
                              minLength: {
                                value: 8,
                                message: 'Password must be at least 8 characters',
                              },
                            })}
                            type={showNewPassword ? 'text' : 'password'}
                            className={`input pr-10 ${passwordErrors.new_password ? 'input-error' : ''}`}
                            placeholder="Enter new password"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-5 w-5 text-gray-400" />
                            ) : (
                              <Eye className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </div>
                        {passwordErrors.new_password && (
                          <p className="mt-2 text-sm text-red-600">{passwordErrors.new_password.message}</p>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label htmlFor="confirm_password" className="block text-sm font-semibold text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          {...registerPassword('confirm_password', {
                            required: 'Please confirm your new password',
                          })}
                          type="password"
                          className={`input ${passwordErrors.confirm_password ? 'input-error' : ''}`}
                          placeholder="Confirm new password"
                        />
                        {passwordErrors.confirm_password && (
                          <p className="mt-2 text-sm text-red-600">{passwordErrors.confirm_password.message}</p>
                        )}
                      </div>

                      {/* Submit Button */}
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={changePasswordMutation.isPending}
                          className="btn btn-primary"
                        >
                          {changePasswordMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Changing...
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-2" />
                              Change Password
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                  </>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Management</h3>
                    
                    {/* Danger Zone */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <div className="flex items-start space-x-4">
                        <div className="bg-red-100 p-2 rounded-lg flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h4>
                          <p className="text-sm text-red-700 mb-4">
                            Once you delete your account, there is no going back. Please be certain.
                          </p>
                          <button
                            onClick={() => setShowDeleteConfirmation(true)}
                            className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Account Confirmation Modal */}
              {showDeleteConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="bg-red-100 p-2 rounded-lg">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-6">
                      Are you sure you want to delete your account? This action cannot be undone and will permanently delete:
                    </p>
                    
                    <ul className="text-sm text-gray-600 mb-6 space-y-1">
                      <li>• All your transaction data</li>
                      <li>• Your profile information</li>
                      <li>• All analytics and reports</li>
                      <li>• Account settings and preferences</li>
                    </ul>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowDeleteConfirmation(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteAccountMutation.isPending}
                        className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {deleteAccountMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                            Deleting...
                          </>
                        ) : (
                          'Delete Account'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
