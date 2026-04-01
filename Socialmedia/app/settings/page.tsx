// app/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Bell, Lock, Moon, Languages, Download, LogOut,
  Shield, MessageSquare, Ban, Palette, CreditCard, Activity,
  HelpCircle, Camera, Save, AlertTriangle, CheckCircle,
  Eye, EyeOff, Smartphone, Mail, Globe, Search, Trash2,
  Users, UserPlus, AtSign, FileText, Video, Volume2,
  Zap, BarChart, Database, Phone, MapPin, Clock, Loader2,
  ChevronRight, Edit2, X, Plus, Settings as SettingsIcon,
  Wifi, WifiOff, MoonStar, Sun, Laptop, Tablet, Smartphone as MobileIcon
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { toast, Toaster } from 'react-hot-toast';

// Types
type TabType = 'account' | 'security' | 'privacy' | 'notifications' | 'messaging' | 'restrictions' | 'appearance' | 'general' | 'subscription' | 'activity' | 'support';

interface NotificationSettings {
  push: { likes: boolean; comments: boolean; follows: boolean; messages: boolean; mentions: boolean };
  email: { marketing: boolean; security: boolean; digest: boolean; mentions: boolean };
  sms: { twoFactor: boolean; loginAlerts: boolean };
}

interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  postVisibility: 'public' | 'friends' | 'private';
  messagePermission: 'everyone' | 'friends' | 'nobody';
  tagPermission: 'everyone' | 'friends' | 'nobody';
  searchEngineIndexing: boolean;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
}

interface MessagingSettings {
  messageRequests: 'everyone' | 'friends' | 'nobody';
  readReceipts: boolean;
  spamFilterAI: boolean;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  reducedMotion: boolean;
  highContrast: boolean;
  language: string;
}

interface AccountData {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  bio: string;
  dob: string;
  gender: string;
  profilePicture: string | null;
  coverPhoto: string | null;
}

// Button Variant Type
type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary';
type ButtonSize = 'default' | 'sm';

// UI Components with proper typing
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 ${className}`}>{children}</div>;
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="p-6 pb-2">{children}</div>;
}

function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-xl font-semibold ${className}`}>{children}</h2>;
}

function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>;
}

function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 pt-2 ${className}`}>{children}</div>;
}

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
}

function Button({ children, onClick, variant = 'default', size = 'default', disabled = false, className = '' }: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<ButtonVariant, string> = {
    default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    outline: "border border-gray-300 dark:border-gray-700 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800",
    ghost: "hover:bg-gray-100 dark:hover:bg-gray-800",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600",
  };
  const sizes: Record<ButtonSize, string> = {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-xs",
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

function Input({ type = 'text', placeholder, value, onChange, className = '' }: InputProps) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    />
  );
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{children}</label>;
}

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function Switch({ checked, onCheckedChange }: SwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [saving, setSaving] = useState(false);
  
  // Account State
  const [accountData, setAccountData] = useState<AccountData>({
    fullName: session?.user?.name || '',
    username: '',
    email: session?.user?.email || '',
    phone: '',
    bio: '',
    dob: '',
    gender: '',
    profilePicture: null,
    coverPhoto: null,
  });
  
  // Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [loginDevices] = useState([
    { device: 'Chrome on Windows', location: 'New York, USA', date: '2024-01-15', current: true },
    { device: 'Safari on iPhone', location: 'Boston, USA', date: '2024-01-10', current: false },
    { device: 'Firefox on Mac', location: 'Chicago, USA', date: '2024-01-05', current: false },
  ]);
  
  // Privacy State
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'public',
    postVisibility: 'public',
    messagePermission: 'everyone',
    tagPermission: 'everyone',
    searchEngineIndexing: true,
    showOnlineStatus: true,
    showLastSeen: true,
  });
  
  // Notification State
  const [notifications, setNotifications] = useState<NotificationSettings>({
    push: { likes: true, comments: true, follows: true, messages: true, mentions: true },
    email: { marketing: false, security: true, digest: true, mentions: true },
    sms: { twoFactor: true, loginAlerts: true },
  });
  
  // Messaging State
  const [messaging, setMessaging] = useState<MessagingSettings>({
    messageRequests: 'friends',
    readReceipts: true,
    spamFilterAI: true,
  });
  
  // Restrictions State
  const [blockedUsers] = useState([
    { id: 1, name: 'spam_user_123', avatar: '/avatars/default.jpg', date: '2024-01-12' },
    { id: 2, name: 'toxic_follower', avatar: '/avatars/default.jpg', date: '2024-01-08' },
  ]);
  const [restrictedUsers] = useState([
    { id: 3, name: 'annoying_friend', avatar: '/avatars/default.jpg', date: '2024-01-05' },
  ]);
  
  // Appearance State
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: 'system',
    fontSize: 'medium',
    reducedMotion: false,
    highContrast: false,
    language: 'en',
  });
  
  // General State
  const [general, setGeneral] = useState({
    region: 'US',
    dataSaver: false,
    autoPlayVideos: true,
    videoQuality: 'auto' as 'auto' | 'high' | 'medium' | 'low',
  });
  
  // Subscription State
  const [subscription] = useState({
    plan: 'Free',
    expiresAt: null as string | null,
    paymentMethods: [{ id: 1, type: 'Visa', last4: '4242', isDefault: true }],
    transactions: [
      { id: 1, date: '2024-01-01', amount: '$9.99', status: 'completed', description: 'Monthly Premium' },
      { id: 2, date: '2023-12-01', amount: '$9.99', status: 'completed', description: 'Monthly Premium' },
    ],
  });
  
  // Activity State
  const [loginHistory] = useState([
    { date: '2024-01-15 14:30', device: 'Chrome on Windows', location: 'New York, USA', ip: '192.168.1.1' },
    { date: '2024-01-14 09:15', device: 'Safari on iPhone', location: 'Boston, USA', ip: '192.168.1.2' },
    { date: '2024-01-13 22:45', device: 'Firefox on Mac', location: 'Chicago, USA', ip: '192.168.1.3' },
  ]);
  
  // Helper Functions with proper typing
  const handleSave = async (section: string, data: any) => {
    setSaving(true);
    setLoading(prev => ({ ...prev, [section]: true }));
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success(`${section} settings saved successfully!`);
    } catch (error) {
      toast.error(`Failed to save ${section} settings`);
    } finally {
      setSaving(false);
      setLoading(prev => ({ ...prev, [section]: false }));
    }
  };
  
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(prev => ({ ...prev, password: true }));
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };
  
  const handleLogoutAllDevices = async () => {
    if (confirm('Are you sure you want to log out from all devices?')) {
      setLoading(prev => ({ ...prev, logoutAll: true }));
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        toast.success('Logged out from all devices');
      } finally {
        setLoading(prev => ({ ...prev, logoutAll: false }));
      }
    }
  };
  
  const handleDeleteAccount = async () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      setLoading(prev => ({ ...prev, deleteAccount: true }));
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        toast.success('Account deletion requested');
      } finally {
        setLoading(prev => ({ ...prev, deleteAccount: false }));
      }
    }
  };
  
  const tabs: { id: TabType; label: string; icon: any; color: string }[] = [
    { id: 'account', label: 'Account', icon: User, color: 'text-blue-500' },
    { id: 'security', label: 'Security', icon: Lock, color: 'text-red-500' },
    { id: 'privacy', label: 'Privacy', icon: Shield, color: 'text-purple-500' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-yellow-500' },
    { id: 'messaging', label: 'Messaging', icon: MessageSquare, color: 'text-green-500' },
    { id: 'restrictions', label: 'Restrictions', icon: Ban, color: 'text-orange-500' },
    { id: 'appearance', label: 'Appearance', icon: Palette, color: 'text-pink-500' },
    { id: 'general', label: 'General', icon: SettingsIcon, color: 'text-gray-500' },
    { id: 'subscription', label: 'Subscription', icon: CreditCard, color: 'text-emerald-500' },
    { id: 'activity', label: 'Activity', icon: Activity, color: 'text-indigo-500' },
    { id: 'support', label: 'Support', icon: HelpCircle, color: 'text-cyan-500' },
  ];
  
  const fontSizeClasses: Record<string, string> = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };
  
  const currentFontSize = fontSizeClasses[appearance.fontSize];
  
  // Apply accessibility settings to body
  useEffect(() => {
    if (appearance.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
    if (appearance.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [appearance.reducedMotion, appearance.highContrast]);
  
  // Input change handlers
  const handleAccountChange = (field: keyof AccountData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setAccountData({ ...accountData, [field]: e.target.value });
  };
  
  const handlePrivacyChange = <K extends keyof PrivacySettings>(field: K, value: PrivacySettings[K]) => {
    setPrivacy({ ...privacy, [field]: value });
  };
  
  const handleNotificationPushChange = (key: keyof typeof notifications.push, value: boolean) => {
    setNotifications({
      ...notifications,
      push: { ...notifications.push, [key]: value }
    });
  };
  
  const handleNotificationEmailChange = (key: keyof typeof notifications.email, value: boolean) => {
    setNotifications({
      ...notifications,
      email: { ...notifications.email, [key]: value }
    });
  };
  
  const handleNotificationSmsChange = (key: keyof typeof notifications.sms, value: boolean) => {
    setNotifications({
      ...notifications,
      sms: { ...notifications.sms, [key]: value }
    });
  };
  
  const handleMessagingChange = <K extends keyof MessagingSettings>(field: K, value: MessagingSettings[K]) => {
    setMessaging({ ...messaging, [field]: value });
  };
  
  const handleAppearanceChange = <K extends keyof AppearanceSettings>(field: K, value: AppearanceSettings[K]) => {
    setAppearance({ ...appearance, [field]: value });
  };
  
  const handleGeneralChange = (field: keyof typeof general, value: any) => {
    setGeneral({ ...general, [field]: value });
  };
  
  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 ${currentFontSize}`}>
      <Toaster position="top-right" />
      
      <div className="container px-4 py-8 mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text">
            Settings
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Manage your account preferences and security settings
          </p>
        </motion.div>
        
        {/* Tab Navigation - Responsive Grid */}
        <div className="sticky top-0 z-10 flex flex-wrap gap-2 py-4 mb-8 -mt-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-white dark:bg-gray-800 shadow-md text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? tab.color : ''}`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
        
        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Account Settings */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-500" />
                      Profile Information
                    </CardTitle>
                    <CardDescription>Update your public profile information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Profile & Cover Photo */}
                    <div className="space-y-4">
                      <div className="relative h-32 overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                        {accountData.coverPhoto ? (
                          <Image src={accountData.coverPhoto} alt="Cover" fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Camera className="w-8 h-8 text-white/50" />
                          </div>
                        )}
                        <button className="absolute p-2 text-white transition rounded-full bottom-2 right-2 bg-black/50 hover:bg-black/70">
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-end gap-4 -mt-12">
                        <div className="relative">
                          <div className="w-24 h-24 overflow-hidden bg-gray-200 border-4 border-white rounded-full dark:border-gray-900 dark:bg-gray-700">
                            {accountData.profilePicture ? (
                              <Image src={accountData.profilePicture} alt="Profile" fill className="object-cover" />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full text-3xl font-bold text-gray-400">
                                {accountData.fullName?.charAt(0) || 'U'}
                              </div>
                            )}
                          </div>
                          <button className="absolute bottom-0 right-0 p-1.5 bg-blue-500 rounded-full text-white hover:bg-blue-600 transition">
                            <Camera className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input 
                          value={accountData.fullName} 
                          onChange={handleAccountChange('fullName')} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Username</Label>
                        <Input 
                          value={accountData.username} 
                          onChange={handleAccountChange('username')} 
                          placeholder="@username" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input 
                          type="email" 
                          value={accountData.email} 
                          onChange={handleAccountChange('email')} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input 
                          value={accountData.phone} 
                          onChange={handleAccountChange('phone')} 
                          placeholder="+1 (555) 000-0000" 
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Bio</Label>
                        <textarea
                          rows={3}
                          value={accountData.bio}
                          onChange={(e) => setAccountData({...accountData, bio: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-700"
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date of Birth</Label>
                        <Input 
                          type="date" 
                          value={accountData.dob} 
                          onChange={handleAccountChange('dob')} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <select
                          value={accountData.gender}
                          onChange={(e) => setAccountData({...accountData, gender: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-700"
                        >
                          <option value="">Prefer not to say</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="non-binary">Non-binary</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 pt-4 border-t dark:border-gray-800">
                      <Button onClick={() => handleSave('Profile', accountData)} disabled={saving}>
                        {loading.profile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={handleDeleteAccount} className="text-red-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-red-500" />
                      Security
                    </CardTitle>
                    <CardDescription>Protect your account with advanced security features</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Change Password */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Change Password</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowPasswordFields(!showPasswordFields)}>
                          {showPasswordFields ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {showPasswordFields ? 'Hide' : 'Change'}
                        </Button>
                      </div>
                      {showPasswordFields && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                          <Input 
                            type="password" 
                            placeholder="Current Password" 
                            value={currentPassword} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)} 
                          />
                          <Input 
                            type="password" 
                            placeholder="New Password" 
                            value={newPassword} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)} 
                          />
                          <Input 
                            type="password" 
                            placeholder="Confirm New Password" 
                            value={confirmPassword} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)} 
                          />
                          <Button onClick={handleChangePassword} disabled={loading.password} className="w-full">
                            {loading.password ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Update Password
                          </Button>
                        </motion.div>
                      )}
                    </div>
                    
                    {/* 2FA */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div>
                        <h3 className="font-semibold">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                      </div>
                      <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
                    </div>
                    
                    {/* Login Devices */}
                    <div>
                      <h3 className="mb-3 font-semibold">Active Sessions</h3>
                      <div className="space-y-3">
                        {loginDevices.map((device, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                              <Smartphone className="w-5 h-5 text-gray-500" />
                              <div>
                                <p className="font-medium">{device.device}</p>
                                <p className="text-xs text-gray-500">{device.location} • {device.date}</p>
                              </div>
                            </div>
                            {device.current && <span className="px-2 py-1 text-xs text-green-700 bg-green-100 rounded-full">Current</span>}
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" onClick={handleLogoutAllDevices} className="w-full mt-3" disabled={loading.logoutAll}>
                        {loading.logoutAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                        Logout from all devices
                      </Button>
                    </div>
                    
                    {/* AI Suspicious Login Detection */}
                    <div className="p-4 border border-red-200 rounded-lg bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 dark:border-red-800">
                      <div className="flex items-start gap-3">
                        <Zap className="w-5 h-5 text-red-500 mt-0.5" />
                        <div>
                          <h3 className="font-semibold">AI Suspicious Login Detection</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Our AI monitors login patterns and alerts you of suspicious activity</p>
                          <div className="flex gap-2 mt-2">
                            <span className="px-2 py-1 text-xs text-green-700 bg-green-100 rounded-full">Active</span>
                            <span className="text-xs text-gray-500">Last scan: 2 minutes ago</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Privacy Settings */}
            {activeTab === 'privacy' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-500" />
                    Privacy Controls
                  </CardTitle>
                  <CardDescription>Control who can see and interact with you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <span>Profile Visibility</span>
                      <select
                        value={privacy.profileVisibility}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePrivacyChange('profileVisibility', e.target.value as any)}
                        className="p-1 bg-transparent border rounded-md"
                      >
                        <option value="public">Public</option>
                        <option value="friends">Friends Only</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <span>Post Visibility</span>
                      <select
                        value={privacy.postVisibility}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePrivacyChange('postVisibility', e.target.value as any)}
                        className="p-1 bg-transparent border rounded-md"
                      >
                        <option value="public">Public</option>
                        <option value="friends">Friends Only</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <span>Who can message you</span>
                      <select
                        value={privacy.messagePermission}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePrivacyChange('messagePermission', e.target.value as any)}
                        className="p-1 bg-transparent border rounded-md"
                      >
                        <option value="everyone">Everyone</option>
                        <option value="friends">Friends Only</option>
                        <option value="nobody">Nobody</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <span>Who can tag you</span>
                      <select
                        value={privacy.tagPermission}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePrivacyChange('tagPermission', e.target.value as any)}
                        className="p-1 bg-transparent border rounded-md"
                      >
                        <option value="everyone">Everyone</option>
                        <option value="friends">Friends Only</option>
                        <option value="nobody">Nobody</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <span>Show online status</span>
                      <Switch checked={privacy.showOnlineStatus} onCheckedChange={(val: boolean) => handlePrivacyChange('showOnlineStatus', val)} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <span>Show last seen</span>
                      <Switch checked={privacy.showLastSeen} onCheckedChange={(val: boolean) => handlePrivacyChange('showLastSeen', val)} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <span>Allow search engine indexing</span>
                      <Switch checked={privacy.searchEngineIndexing} onCheckedChange={(val: boolean) => handlePrivacyChange('searchEngineIndexing', val)} />
                    </div>
                  </div>
                  <Button onClick={() => handleSave('Privacy', privacy)} disabled={saving} className="w-full">
                    {loading.Privacy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Privacy Settings
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-yellow-500" />
                    Notifications
                  </CardTitle>
                  <CardDescription>Customize how you receive alerts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="flex items-center gap-2 mb-3 font-semibold"><Smartphone className="w-4 h-4" /> Push Notifications</h3>
                    <div className="space-y-3">
                      {Object.entries(notifications.push).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="capitalize">{key}</span>
                          <Switch checked={val} onCheckedChange={(checked: boolean) => handleNotificationPushChange(key as keyof typeof notifications.push, checked)} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t dark:border-gray-800">
                    <h3 className="flex items-center gap-2 mb-3 font-semibold"><Mail className="w-4 h-4" /> Email Notifications</h3>
                    <div className="space-y-3">
                      {Object.entries(notifications.email).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="capitalize">{key}</span>
                          <Switch checked={val} onCheckedChange={(checked: boolean) => handleNotificationEmailChange(key as keyof typeof notifications.email, checked)} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t dark:border-gray-800">
                    <h3 className="flex items-center gap-2 mb-3 font-semibold"><MessageSquare className="w-4 h-4" /> SMS Notifications</h3>
                    <div className="space-y-3">
                      {Object.entries(notifications.sms).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <Switch checked={val} onCheckedChange={(checked: boolean) => handleNotificationSmsChange(key as keyof typeof notifications.sms, checked)} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button onClick={() => handleSave('Notification', notifications)} className="w-full">
                    {loading.Notification ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Notification Settings
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Messaging Settings */}
            {activeTab === 'messaging' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-500" />
                    Messaging
                  </CardTitle>
                  <CardDescription>Control your chat experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <span>Who can send you messages</span>
                    <select
                      value={messaging.messageRequests}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleMessagingChange('messageRequests', e.target.value as any)}
                      className="p-1 bg-transparent border rounded-md"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="friends">Friends Only</option>
                      <option value="nobody">Nobody</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <span>Read Receipts</span>
                    <Switch checked={messaging.readReceipts} onCheckedChange={(val: boolean) => handleMessagingChange('readReceipts', val)} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <span>AI-Powered Spam Filter</span>
                    <Switch checked={messaging.spamFilterAI} onCheckedChange={(val: boolean) => handleMessagingChange('spamFilterAI', val)} />
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/20 dark:to-teal-950/20">
                    <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                      <Zap className="w-4 h-4" /> AI spam filter is {messaging.spamFilterAI ? 'active' : 'inactive'}. It automatically blocks suspicious messages.
                    </p>
                  </div>
                  <Button onClick={() => handleSave('Messaging', messaging)} className="w-full">
                    {loading.Messaging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Messaging Settings
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Restrictions Settings */}
            {activeTab === 'restrictions' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Ban className="w-5 h-5 text-orange-500" />
                      Blocked Users
                    </CardTitle>
                    <CardDescription>Users you've blocked cannot interact with you</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {blockedUsers.length === 0 ? (
                      <p className="text-gray-500">No blocked users</p>
                    ) : (
                      <div className="space-y-3">
                        {blockedUsers.map(user => (
                          <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 bg-gray-300 rounded-full dark:bg-gray-600">
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">@{user.name}</p>
                                <p className="text-xs text-gray-500">Blocked on {user.date}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-blue-500">Unblock</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Restricted Users</CardTitle>
                    <CardDescription>Restricted users can only see your public posts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {restrictedUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-300 rounded-full dark:bg-gray-600">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">@{user.name}</p>
                            <p className="text-xs text-gray-500">Restricted on {user.date}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">Remove Restriction</Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Appearance Settings */}
            {activeTab === 'appearance' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-pink-500" />
                    Appearance & Preferences
                  </CardTitle>
                  <CardDescription>Customize your interface experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Theme</Label>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {(['light', 'dark', 'system'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            handleAppearanceChange('theme', t);
                            setTheme(t);
                          }}
                          className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                            appearance.theme === t ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          {t === 'light' && <Sun className="w-5 h-5" />}
                          {t === 'dark' && <MoonStar className="w-5 h-5" />}
                          {t === 'system' && <Laptop className="w-5 h-5" />}
                          <span className="text-sm capitalize">{t}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Font Size</Label>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {(['small', 'medium', 'large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => handleAppearanceChange('fontSize', size)}
                          className={`p-2 rounded-lg border ${
                            appearance.fontSize === size ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <span className={size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'}>Aa</span>
                          <span className="ml-1 text-xs capitalize">({size})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Language</Label>
                    <select
                      value={appearance.language}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleAppearanceChange('language', e.target.value)}
                      className="w-full p-2 mt-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-700"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="ja">日本語</option>
                    </select>
                  </div>
                  
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Reduced Motion</span>
                      <Switch checked={appearance.reducedMotion} onCheckedChange={(val: boolean) => handleAppearanceChange('reducedMotion', val)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>High Contrast Mode</span>
                      <Switch checked={appearance.highContrast} onCheckedChange={(val: boolean) => handleAppearanceChange('highContrast', val)} />
                    </div>
                  </div>
                  
                  <Button onClick={() => handleSave('Appearance', appearance)} className="w-full">
                    {loading.Appearance ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Appearance
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* General Settings */}
            {activeTab === 'general' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-gray-500" />
                    General Settings
                  </CardTitle>
                  <CardDescription>System-level preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Region</Label>
                    <select
                      value={general.region}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleGeneralChange('region', e.target.value)}
                      className="w-full p-2 mt-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-700"
                    >
                      <option value="US">United States</option>
                      <option value="UK">United Kingdom</option>
                      <option value="CA">Canada</option>
                      <option value="AU">Australia</option>
                      <option value="IN">India</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Data Saver Mode</span>
                    <Switch checked={general.dataSaver} onCheckedChange={(val: boolean) => handleGeneralChange('dataSaver', val)} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Auto-play Videos</span>
                    <Switch checked={general.autoPlayVideos} onCheckedChange={(val: boolean) => handleGeneralChange('autoPlayVideos', val)} />
                  </div>
                  
                  <div>
                    <Label>Video Quality</Label>
                    <select
                      value={general.videoQuality}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleGeneralChange('videoQuality', e.target.value as any)}
                      className="w-full p-2 mt-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-700"
                    >
                      <option value="auto">Auto (Recommended)</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  
                  <Button onClick={() => handleSave('General', general)} className="w-full">
                    {loading.General ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save General Settings
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Subscription Settings */}
            {activeTab === 'subscription' && (
              <div className="space-y-6">
                <Card className="text-white bg-gradient-to-r from-emerald-500 to-teal-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Current Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{subscription.plan}</div>
                    {subscription.expiresAt && <p className="text-emerald-100">Expires: {subscription.expiresAt}</p>}
                    <Button variant="secondary" className="mt-4">Upgrade to Premium</Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {subscription.paymentMethods.map(method => (
                      <div key={method.id} className="flex items-center justify-between p-3 border-b dark:border-gray-800">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-4 h-4" />
                          <span>{method.type} ending in {method.last4}</span>
                          {method.isDefault && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Default</span>}
                        </div>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full mt-4">Add Payment Method</Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {subscription.transactions.map(transaction => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border-b dark:border-gray-800">
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-xs text-gray-500">{transaction.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{transaction.amount}</p>
                          <p className="text-xs text-green-600">{transaction.status}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Activity & Data */}
            {activeTab === 'activity' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-500" />
                      Login History
                    </CardTitle>
                    <CardDescription>Recent login activity on your account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loginHistory.map((login, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border-b dark:border-gray-800 last:border-0">
                        <div>
                          <p className="font-medium">{login.device}</p>
                          <p className="text-sm text-gray-500">{login.location} • {login.ip}</p>
                        </div>
                        <p className="text-sm text-gray-500">{login.date}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Data & Privacy</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5" />
                        <span>Download your data</span>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Request
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center gap-3">
                        <Trash2 className="w-5 h-5 text-red-500" />
                        <span>Delete all activity</span>
                      </div>
                      <Button variant="outline" size="sm" className="text-red-500">Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Help & Support */}
            {activeTab === 'support' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-cyan-500" />
                    Help & Support
                  </CardTitle>
                  <CardDescription>Get help with your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <button className="p-4 text-left transition rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <h3 className="font-semibold">Help Center</h3>
                      <p className="text-sm text-gray-500">Browse articles and guides</p>
                    </button>
                    <button className="p-4 text-left transition rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <h3 className="font-semibold">FAQs</h3>
                      <p className="text-sm text-gray-500">Frequently asked questions</p>
                    </button>
                    <button className="p-4 text-left transition rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <h3 className="font-semibold">Contact Support</h3>
                      <p className="text-sm text-gray-500">Get help from our team</p>
                    </button>
                    <button className="p-4 text-left transition rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <h3 className="font-semibold">Report a Problem</h3>
                      <p className="text-sm text-gray-500">Let us know about issues</p>
                    </button>
                  </div>
                  <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">Need immediate help? Our support team is available 24/7.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}