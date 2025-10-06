import React, { useState, useEffect } from 'react';
import { Users, Plus, Settings, Clock, User, Home, Calendar, BarChart3, Save, Building2, Menu, TrendingUp,UserCheck,X,Mail,Edit3, Play, Pause, Square, CheckCircle, AlertCircle, XCircle, Info, Bell, Phone, Trash2, Timer, Volume2, Eye } from 'lucide-react';
import { useAuth, useOrganizations, useServices, useQueues, useUserProfile, Organization, Service, Queue, QueueClient } from './hooks/useFirebase';
import HourlyBarChart from './components/HourlyBarChart';
import AreaLineChart from './components/AreaLineChart';
import useToasts from './contexts/useToasts';
import { doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { db } from './config/firebase';
import Modal from './components/Modal';
import FormField from './components/FormField';
import Button from './components/Button';
// XLSX is imported dynamically in exportStats to avoid compile-time missing module errors if not installed

type Page = 'home' | 'login' | 'register' | 'dashboard' | 'organization' | 'services' | 'queues' | 'waiting' | 'notifications' | 'stats';
type UserType = 'client' | 'owner';

interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [userType, setUserType] = useState<UserType>('client');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    role: 'client' as 'client' | 'owner'
  });
  const [authError, setAuthError] = useState('');
  const [authFormLoading, setAuthFormLoading] = useState(false);
  
  // Modal states
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  //const [showQueueModal, setShowQueueModal] = useState(false);
  const [showJoinQueueModal, setShowJoinQueueModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);

  // Form states
  const [orgForm, setOrgForm] = useState({
    name: '',
    description: '',
    workingHours: { start: '09:00', end: '18:00' },
    maxQueueSize: 50,
    estimatedServiceTime: 15
  });
  
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    estimatedDuration: 15,
    isActive: true
  });

  const [joinQueueForm, setJoinQueueForm] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [leavingQueueId, setLeavingQueueId] = useState<string | null>(null);

  // Firebase hooks
  const { user, loading: authHookLoading, signUp, signIn, logout } = useAuth();
  const { organizations, loading: orgsLoading, createOrganization, updateOrganization, deleteOrganization } = useOrganizations(user?.uid);
  const { services, loading: servicesLoading, createService, updateService, deleteService } = useServices(selectedOrganization?.id);
  const { queues, loading: queuesLoading, updateQueue, joinQueue, callNext, createQueue, leaveQueue } = useQueues(selectedOrganization?.id);
  const { profile } = useUserProfile(user?.uid);
  const [serviceMap, setServiceMap] = useState<Record<string, Service>>({});

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthFormLoading(true);

    try {
      if (authMode === 'signup') {
        if (authData.password !== authData.confirmPassword) {
          throw new Error('Les mots de passe ne correspondent pas');
        }
        if (authData.password.length < 6) {
          throw new Error('Le mot de passe doit contenir au moins 6 caractères');
        }
        
        await signUp(authData.email, authData.password, {
          name: authData.name,
          phone: authData.phone,
          role: authData.role
        });
      } else {
        await signIn(authData.email, authData.password);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setAuthError(error.message);
      } else {
        setAuthError('Une erreur est survenue');
      }
    } finally {
      setAuthFormLoading(false);
    }
  };

  const resetAuthForm = () => {
    setAuthData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phone: '',
      role: 'client'
    });
    setAuthError('');
  };

  // Mock data for demo
  const mockNotifications: NotificationItem[] = [
    {
      id: '1',
      type: 'info',
      title: 'Position mise à jour',
      message: 'Vous êtes maintenant 3ème dans la file',
      time: '2 min',
      read: false
    },
    {
      id: '2',
      type: 'success',
      title: 'File rejointe',
      message: 'Vous avez rejoint la file "Consultation générale"',
      time: '5 min',
      read: true
    },
    {
      id: '3',
      type: 'warning',
      title: 'Temps d\'attente prolongé',
      message: 'Le temps d\'attente estimé a augmenté de 10 minutes',
      time: '15 min',
      read: false
    }
  ];

  // Removed unused mockQueueData to fix compile error.

  useEffect(() => {
    if (user && !authHookLoading) {
      setCurrentPage('dashboard');
    }
  }, [user, authHookLoading]);

  // Prevent body scroll when mobile sidebar is open to avoid double scrolling
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow || '';
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = prev;
    }
    return () => { document.body.style.overflow = prev; };
  }, [sidebarOpen]);

  useEffect(() => {
    if (organizations.length > 0 && !selectedOrganization) {
      setSelectedOrganization(organizations[0]);
    }
  }, [organizations, selectedOrganization]);

  // Prefill joinQueue form from user profile when the modal opens
  useEffect(() => {
    if (showJoinQueueModal && profile) {
      setJoinQueueForm(prev => ({
        name: profile.name || prev.name,
        phone: profile.phone || prev.phone,
        email: profile.email || prev.email
      }));
    }
  }, [showJoinQueueModal, profile]);

  // Maintain a cache of services (serviceId -> Service). Populate from the services hook
  useEffect(() => {
    if (!services || services.length === 0) return;
    setServiceMap(prev => {
      const copy = { ...prev };
      services.forEach(s => { copy[s.id] = s; });
      return copy;
    });
  }, [services]);

  // Ensure services referenced by queues are loaded in the cache; fetch missing ones
  useEffect(() => {
    const missing = new Set<string>();
    queues.forEach(q => {
      if (!serviceMap[q.serviceId]) missing.add(q.serviceId);
    });

    if (missing.size === 0) return;

    const fetchMissing = async () => {
      const updates: Record<string, Service> = {};
      for (const id of Array.from(missing)) {
        try {
          const snap = await getDoc(firestoreDoc(db, 'services', id));
          if (snap.exists()) {
            const data = snap.data() as Partial<Service>;
            // Ensure we don't duplicate 'id' when spreading
            updates[id] = { ...(data as Service), id: snap.id };
          }
        } catch (e) {
          console.error('Error fetching service', id, e);
        }
      }
      if (Object.keys(updates).length > 0) setServiceMap(prev => ({ ...prev, ...updates }));
    };

    fetchMissing();
  }, [queues, serviceMap]);

  const handleCreateOrganization = async () => {
    try {
      if (!user) return;
      
      await createOrganization({
        name: orgForm.name,
        description: orgForm.description,
        ownerId: user.uid,
        settings: {
          workingHours: orgForm.workingHours,
          maxQueueSize: orgForm.maxQueueSize,
          estimatedServiceTime: orgForm.estimatedServiceTime
        }
      });
      
      setShowOrgModal(false);
      setOrgForm({
        name: '',
        description: '',
        workingHours: { start: '09:00', end: '18:00' },
        maxQueueSize: 50,
        estimatedServiceTime: 15
      });
    } catch (error) {
      console.error('Error creating organization:', error);
    }
  };

  const handleCreateService = async () => {
    try {
      if (!selectedOrganization) return;
      
      await createService({
        name: serviceForm.name,
        description: serviceForm.description,
        organizationId: selectedOrganization.id,
        estimatedDuration: serviceForm.estimatedDuration,
        isActive: serviceForm.isActive
      });
      
      setShowServiceModal(false);
      setServiceForm({
        name: '',
        description: '',
        estimatedDuration: 15,
        isActive: true
      });
    } catch (error) {
      console.error('Error creating service:', error);
    }
  };

  const handleJoinQueue = async () => {
    try {
      if (!selectedQueue || !user) return;
      
      await joinQueue(selectedQueue.id, {
        userId: user.uid,
        userName: joinQueueForm.name,
        userPhone: joinQueueForm.phone,
        status: 'waiting'
      });
      
      setShowJoinQueueModal(false);
      setJoinQueueForm({ name: '', phone: '', email: '' });
    } catch (error) {
      console.error('Error joining queue:', error);
    }
  };

  const { notify, confirm } = useToasts();

  const handleLeaveQueue = async (queueId: string) => {
    if (!user) return;
    const ok = await confirm({ message: 'Voulez-vous vraiment quitter cette file ?' });
    if (!ok) return;

    try {
      setLeavingQueueId(queueId);
      await leaveQueue(queueId, user.uid);
      notify('Vous avez quitté la file', 'success');
    } catch (error) {
      console.error('Error leaving queue:', error);
      notify('Erreur lors de la sortie de la file', 'error');
    } finally {
      setLeavingQueueId(null);
    }
  };

  const handleUpdateOrganization = async () => {
    try {
      if (!editingOrg) return;
      
      await updateOrganization(editingOrg.id, {
        name: orgForm.name,
        description: orgForm.description,
        settings: {
          workingHours: orgForm.workingHours,
          maxQueueSize: orgForm.maxQueueSize,
          estimatedServiceTime: orgForm.estimatedServiceTime
        }
      });
      
      setShowOrgModal(false);
      setEditingOrg(null);
      setOrgForm({
        name: '',
        description: '',
        workingHours: { start: '09:00', end: '18:00' },
        maxQueueSize: 50,
        estimatedServiceTime: 15
      });
    } catch (error) {
      console.error('Error updating organization:', error);
    }
  };

  const handleUpdateService = async () => {
    try {
      if (!editingService) return;
      
      await updateService(editingService.id, {
        name: serviceForm.name,
        description: serviceForm.description,
        estimatedDuration: serviceForm.estimatedDuration,
        isActive: serviceForm.isActive
      });
      
      setShowServiceModal(false);
      setEditingService(null);
      setServiceForm({
        name: '',
        description: '',
        estimatedDuration: 15,
        isActive: true
      });
    } catch (error) {
      console.error('Error updating service:', error);
    }
  };

  const openEditOrgModal = (org: Organization) => {
    setEditingOrg(org);
    setOrgForm({
      name: org.name,
      description: org.description,
      workingHours: org.settings.workingHours,
      maxQueueSize: org.settings.maxQueueSize,
      estimatedServiceTime: org.settings.estimatedServiceTime
    });
    setShowOrgModal(true);
  };

  const openEditServiceModal = (service: Service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description,
      estimatedDuration: service.estimatedDuration,
      isActive: service.isActive
    });
    setShowServiceModal(true);
  };

  const handleDeleteOrganization = async (orgId: string) => {
    const ok = await confirm({ message: 'Êtes-vous sûr de vouloir supprimer cette organisation ?' });
    if (!ok) return;
    try {
      await deleteOrganization(orgId);
      notify('Organisation supprimée', 'success');
    } catch (error) {
      console.error('Error deleting organization:', error);
      notify('Erreur lors de la suppression', 'error');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    const ok = await confirm({ message: 'Êtes-vous sûr de vouloir supprimer ce service ?' });
    if (!ok) return;
    try {
      await deleteService(serviceId);
      notify('Service supprimé', 'success');
    } catch (error) {
      console.error('Error deleting service:', error);
      notify('Erreur lors de la suppression du service', 'error');
    }
  };

  const handleToggleQueueStatus = async (queueId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'open' ? 'paused' : 'open';
      await updateQueue(queueId, { status: newStatus });
    } catch (error) {
      console.error('Error updating queue status:', error);
    }
  };

  const handleCallNext = async (queueId: string) => {
    try {
      // Try to determine the next client (best-effort) before calling server
      const queue = queues.find(q => q.id === queueId);
      const nextClient = queue?.clients.find(c => c.status === 'waiting');

      await callNext(queueId);

      // Announce the client via TTS (best-effort, client-side)
      if (nextClient && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speak(`${nextClient.userName}, c'est votre tour.`);
      }
    } catch (error) {
      console.error('Error calling next client:', error);
    }
  };

  const speak = (text: string) => {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'fr-FR';
      // Optional voice selection could be added here
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.error('TTS error', e);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-green-400';
      case 'paused': return 'text-yellow-400';
      case 'closed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Play size={16} />;
      case 'paused': return <Pause size={16} />;
      case 'closed': return <Square size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-400" size={20} />;
      case 'warning': return <AlertCircle className="text-yellow-400" size={20} />;
      case 'error': return <XCircle className="text-red-400" size={20} />;
      default: return <Info className="text-blue-400" size={20} />;
    }
  };

  const renderSidebar = () => {
    const menuItems = userType === 'owner' ? [
      { icon: Home, label: 'Dashboard', page: 'dashboard' as Page },
      { icon: Building2, label: 'Mon Organisation', page: 'organization' as Page },
      { icon: Settings, label: 'Mes Services', page: 'services' as Page },
      { icon: Users, label: 'Mes Files', page: 'queues' as Page },
      { icon: BarChart3, label: 'Statistiques', page: 'stats' as Page },
      { icon: Bell, label: 'Notifications', page: 'notifications' as Page }
    ] : [
      { icon: Home, label: 'Dashboard', page: 'dashboard' as Page },
      { icon: Clock, label: 'Mes Files', page: 'waiting' as Page },
      { icon: Bell, label: 'Notifications', page: 'notifications' as Page }
    ];

    return (
      <>
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`
          fixed top-0 left-0 h-full w-72 bg-[#2A2738] border-r border-[#00FFF7]/20 z-50 flex flex-col justify-between
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `} style={{ maxHeight: '100vh' }}>
          {/* Logo */}
          <div className="p-6 border-b border-[#00FFF7]/10">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black bg-gradient-to-br from-[#00FFF7] via-[#8C1AFF] to-[#FF6B6B] bg-clip-text text-transparent">F</span>
              <span className="text-xl font-bold gradient-animate">Foléni</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-4 flex-1 overflow-auto touch-auto overscroll-contain">
            {menuItems.map((item) => (
              <button
                key={item.page}
                onClick={() => {
                  setCurrentPage(item.page);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${currentPage === item.page 
                    ? 'bg-[#00FFF7]/10 text-[#00FFF7] border border-[#00FFF7]/30' 
                    : 'text-gray-300 hover:text-white hover:bg-[#1F1B2E]'
                  }
                `}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-[#00FFF7]/10">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1F1B2E]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#00FFF7] to-[#8C1AFF] flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.email || 'Utilisateur'}</p>
                <p className="text-gray-400 text-xs capitalize">{userType}</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderHeader = () => (
    <header className="bg-[#2A2738]/80 backdrop-blur-xl border-b border-[#00FFF7]/10 sticky top-0 z-30">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-gray-300 hover:text-white hover:bg-[#00FFF7]/10 rounded-lg transition-all duration-200"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div>
            <h1 className="text-xl font-bold text-white">
              {currentPage === 'home' && 'Accueil'}
              {currentPage === 'dashboard' && 'Dashboard'}
              {currentPage === 'organization' && 'Mon Organisation'}
              {currentPage === 'services' && 'Mes Services'}
              {currentPage === 'queues' && 'Mes Files'}
              {currentPage === 'waiting' && 'Mes Files d\'Attente'}
              {currentPage === 'notifications' && 'Notifications'}
              {currentPage === 'stats' && 'Statistiques'}
            </h1>
            {selectedOrganization && (
              <p className="text-sm text-gray-400">{selectedOrganization.name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-gray-300 hover:text-white hover:bg-[#00FFF7]/10 rounded-lg transition-all duration-200">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF6B6B] rounded-full animate-pulse" />
          </button>
          
          <button
            onClick={async () => {
              try {
                await logout();
              } finally {
                // Clear ephemeral data and go to home
                try { localStorage.clear(); sessionStorage.clear(); } catch { console.warn('Could not clear storage'); }
                setCurrentPage('home');
              }
            }}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#FF6B6B]/10 rounded-lg transition-all duration-200"
          >
            D connexion
          </button>
        </div>
      </div>
    </header>
  );

  const renderHomePage = () => (
    <div className="min-h-screen bg-[#1F1B2E] flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00FFF7] via-[#8C1AFF] to-[#FF6B6B] flex items-center justify-center glow-border animate-pulse-glow">
              <span className="text-white font-bold text-4xl">F</span>
            </div>
            <h1 className="text-6xl font-bold gradient-animate">Foléni</h1>
          </div>

          {/* Tagline */}
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            La plateforme futuriste de gestion de files d'attente. 
            Rejoignez l'avenir du service client avec une expérience premium et intuitive.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              onClick={() => {
                setUserType('client');
                setCurrentPage('login');
              }}
              size="lg"
              className="min-w-[200px]"
            >
              <Users size={20} />
              Espace Client
            </Button>
            
            <Button
              onClick={() => {
                setUserType('owner');
                setCurrentPage('login');
              }}
              variant="secondary"
              size="lg"
              className="min-w-[200px]"
            >
              <Building2 size={20} />
              Espace Professionnel
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-[#2A2738] p-6 rounded-2xl border border-[#00FFF7]/20 card-hover-effect">
              <div className="w-12 h-12 bg-[#00FFF7]/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Clock className="text-[#00FFF7]" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Temps Réel</h3>
              <p className="text-gray-400 text-sm">
                Suivez votre position et temps d'attente en direct avec des mises à jour instantanées.
              </p>
            </div>

            <div className="bg-[#2A2738] p-6 rounded-2xl border border-[#8C1AFF]/20 card-hover-effect">
              <div className="w-12 h-12 bg-[#8C1AFF]/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Bell className="text-[#8C1AFF]" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Notifications</h3>
              <p className="text-gray-400 text-sm">
                Recevez des alertes personnalisées pour ne jamais manquer votre tour.
              </p>
            </div>

            <div className="bg-[#2A2738] p-6 rounded-2xl border border-[#FF6B6B]/20 card-hover-effect">
              <div className="w-12 h-12 bg-[#FF6B6B]/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <BarChart3 className="text-[#FF6B6B]" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Analytics</h3>
              <p className="text-gray-400 text-sm">
                Analysez vos performances avec des statistiques avancées et des insights IA.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLoginPage = () => (
    <div className="min-h-screen bg-[#1F1B2E] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#2A2738] p-8 rounded-2xl border border-[#00FFF7]/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-4xl font-black bg-gradient-to-br from-[#00FFF7] via-[#8C1AFF] to-[#FF6B6B] bg-clip-text text-transparent">F</span>
              <span className="text-2xl font-bold gradient-animate">Foléni</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {authMode === 'signin' ? 'Connexion' : 'Inscription'} {userType === 'owner' ? 'Professionnel' : 'Client'}
            </h2>
            <p className="text-gray-400 text-sm">
              {authMode === 'signin' ? 'Accédez à' : 'Créez'} votre espace {userType === 'owner' ? 'de gestion' : 'personnel'}
            </p>
          </div>

          {authError && (
            <div className="mb-6 p-4 bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 rounded-xl">
              <p className="text-[#FF6B6B] text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {authError}
              </p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            {authMode === 'signup' && (
              <>
                <FormField
                  label="Nom complet"
                  value={authData.name}
                  onChange={(value) => setAuthData(prev => ({ ...prev, name: value }))}
                  placeholder="Votre nom complet"
                  icon={<User size={20} />}
                  required
                />
                
                <FormField
                  label="Téléphone"
                  type="tel"
                  value={authData.phone}
                  onChange={(value) => setAuthData(prev => ({ ...prev, phone: value }))}
                  placeholder="+33 6 12 34 56 78"
                  icon={<Phone size={20} />}
                  required
                />

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">
                    Type de compte <span className="text-[#FF6B6B] ml-1">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAuthData(prev => ({ ...prev, role: 'client' }))}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        authData.role === 'client'
                          ? 'border-[#00FFF7] bg-[#00FFF7]/10 text-[#00FFF7]'
                          : 'border-gray-600 bg-[#1F1B2E] text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <Users size={20} className="mx-auto mb-2" />
                      <span className="text-sm font-medium">Client</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthData(prev => ({ ...prev, role: 'owner' }))}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        authData.role === 'owner'
                          ? 'border-[#8C1AFF] bg-[#8C1AFF]/10 text-[#8C1AFF]'
                          : 'border-gray-600 bg-[#1F1B2E] text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <Building2 size={20} className="mx-auto mb-2" />
                      <span className="text-sm font-medium">Propriétaire</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <FormField
              label="Email"
              type="email"
              value={authData.email}
              onChange={(value) => setAuthData(prev => ({ ...prev, email: value }))}
              placeholder="votre@email.com"
              icon={<Mail size={20} />}
              required
            />
            
            <FormField
              label="Mot de passe"
              type="password"
              value={authData.password}
              onChange={(value) => setAuthData(prev => ({ ...prev, password: value }))}
              placeholder="••••••••"
              required
            />

            {authMode === 'signup' && (
              <FormField
                label="Confirmer le mot de passe"
                type="password"
                value={authData.confirmPassword}
                onChange={(value) => setAuthData(prev => ({ ...prev, confirmPassword: value }))}
                placeholder="••••••••"
                required
              />
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={authFormLoading}
            >
              {authMode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                resetAuthForm();
              }}
              className="text-[#00FFF7] hover:text-white text-sm transition-colors duration-200"
            >
              {authMode === 'signin' ? 'Pas encore de compte ? S\'inscrire' : 'Déjà un compte ? Se connecter'}
            </button>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => setCurrentPage('home')}
              className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
            >
              ← Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="p-6 space-y-6">
      {/* Different dashboards for owner and client */}
      {userType === 'owner' ? (
        (() => {
          // Owner view: metrics for selected organization or first owned org
          const org = selectedOrganization && selectedOrganization.ownerId === user?.uid
            ? selectedOrganization
            : organizations.find(o => o.ownerId === user?.uid) || selectedOrganization;
          const orgQueues = org ? queues.filter(q => q.organizationId === org.id) : [];
          const clientsActive = orgQueues.reduce((acc, q) => acc + q.clients.length, 0);
          const avgWait = Math.round(orgQueues.reduce((acc, q) => acc + q.estimatedWaitTime, 0) / Math.max(orgQueues.length, 1));
          const totalServed = orgQueues.reduce((acc, q) => acc + q.totalServed, 0);

          return (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Dashboard Pro — {org ? org.name : 'Organisation'}</h1>
                  <p className="text-gray-400">Vue propriétaire: métriques pour votre organisation</p>
                </div>
                <div>
                  <Button onClick={() => setCurrentPage('queues')}>Gérer mes files</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#2A2738] p-6 rounded-2xl border border-[#00FFF7]/20 card-hover-effect">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-[#00FFF7]/10 rounded-xl flex items-center justify-center">
                      <Users className="text-[#00FFF7]" size={24} />
                    </div>
                    <span className="text-2xl font-bold text-white">{clientsActive}</span>
                  </div>
                  <h3 className="text-gray-300 text-sm font-medium">Clients Actifs</h3>
                  <p className="text-[#00FFF7] text-xs mt-1">Sur vos files</p>
                </div>

                <div className="bg-[#2A2738] p-6 rounded-2xl border border-[#8C1AFF]/20 card-hover-effect">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-[#8C1AFF]/10 rounded-xl flex items-center justify-center">
                      <Clock className="text-[#8C1AFF]" size={24} />
                    </div>
                    <span className="text-2xl font-bold text-white">{avgWait}m</span>
                  </div>
                  <h3 className="text-gray-300 text-sm font-medium">Temps Moyen</h3>
                  <p className="text-green-400 text-xs mt-1">Basé sur vos files</p>
                </div>

                <div className="bg-[#2A2738] p-6 rounded-2xl border border-[#FF6B6B]/20 card-hover-effect">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-[#FF6B6B]/10 rounded-xl flex items-center justify-center">
                      <TrendingUp className="text-[#FF6B6B]" size={24} />
                    </div>
                    <span className="text-2xl font-bold text-white">94%</span>
                  </div>
                  <h3 className="text-gray-300 text-sm font-medium">Satisfaction</h3>
                  <p className="text-green-400 text-xs mt-1">+3% ce mois</p>
                </div>

                <div className="bg-[#2A2738] p-6 rounded-2xl border border-yellow-400/20 card-hover-effect">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-yellow-400/10 rounded-xl flex items-center justify-center">
                      <UserCheck className="text-yellow-400" size={24} />
                    </div>
                    <span className="text-2xl font-bold text-white">{totalServed}</span>
                  </div>
                  <h3 className="text-gray-300 text-sm font-medium">Clients Traités</h3>
                  <p className="text-green-400 text-xs mt-1">Depuis le lancement</p>
                </div>
              </div>

              <div className="bg-[#2A2738] p-6 rounded-2xl border border-[#00FFF7]/20">
                <h2 className="text-xl font-bold text-white mb-4">Actions Rapides</h2>
                <div className="flex gap-3">
                  <Button onClick={() => setCurrentPage('services')}>Gérer Services</Button>
                  <Button onClick={() => setCurrentPage('queues')}>Voir Files</Button>
                </div>
              </div>
            </>
          );
        })()
      ) : (
        (() => {
          // Client view: focused on user's queues and personal position
          const myQueues = user ? queues.filter(q => q.clients.some(c => c.userId === user.uid)) : [];
          const myQueuesCount = myQueues.length;
          const personsAhead = myQueues.reduce((acc, q) => {
            const me = q.clients.find(c => c.userId === user?.uid);
            if (!me) return acc;
            return acc + Math.max(0, me.position - 1);
          }, 0);
          const avgMyWait = myQueues.length ? Math.round(myQueues.reduce((acc, q) => acc + q.estimatedWaitTime, 0) / myQueues.length) : 0;
          const totalServedGlobal = queues.reduce((acc, q) => acc + q.totalServed, 0);

          return (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Mon Dashboard</h1>
                  <p className="text-gray-400">Vue client: suivez vos files et positions</p>
                </div>
                <div>
                  <Button onClick={() => setCurrentPage('waiting')}>Voir mes files</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#2A2738] p-6 rounded-2xl border border-[#00FFF7]/20 card-hover-effect">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-[#00FFF7]/10 rounded-xl flex items-center justify-center">
                      <Users className="text-[#00FFF7]" size={24} />
                    </div>
                    <span className="text-2xl font-bold text-white">{myQueuesCount}</span>
                  </div>
                  <h3 className="text-gray-300 text-sm font-medium">Mes Files</h3>
                  <p className="text-[#00FFF7] text-xs mt-1">Files où vous êtes inscrit</p>
                </div>

                <div className="bg-[#2A2738] p-6 rounded-2xl border border-[#8C1AFF]/20 card-hover-effect">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-[#8C1AFF]/10 rounded-xl flex items-center justify-center">
                      <Clock className="text-[#8C1AFF]" size={24} />
                    </div>
                    <span className="text-2xl font-bold text-white">{avgMyWait}m</span>
                  </div>
                  <h3 className="text-gray-300 text-sm font-medium">Mon Temps Moyen</h3>
                  <p className="text-green-400 text-xs mt-1">Est. pour vos files</p>
                </div>

                <div className="bg-[#2A2738] p-6 rounded-2xl border border-[#FF6B6B]/20 card-hover-effect">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-[#FF6B6B]/10 rounded-xl flex items-center justify-center">
                      <TrendingUp className="text-[#FF6B6B]" size={24} />
                    </div>
                    <span className="text-2xl font-bold text-white">94%</span>
                  </div>
                  <h3 className="text-gray-300 text-sm font-medium">Satisfaction</h3>
                  <p className="text-green-400 text-xs mt-1">Global</p>
                </div>

                <div className="bg-[#2A2738] p-6 rounded-2xl border border-yellow-400/20 card-hover-effect">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-yellow-400/10 rounded-xl flex items-center justify-center">
                      <UserCheck className="text-yellow-400" size={24} />
                    </div>
                    <span className="text-2xl font-bold text-white">{totalServedGlobal}</span>
                  </div>
                  <h3 className="text-gray-300 text-sm font-medium">Clients Traités (global)</h3>
                  <p className="text-green-400 text-xs mt-1">Depuis le lancement</p>
                </div>
              </div>

              {/* Quick personal info */}
              <div className="bg-[#2A2738] p-6 rounded-2xl border border-[#00FFF7]/20">
                <h2 className="text-lg font-semibold text-white mb-3">Résumé personnel</h2>
                <p className="text-gray-300">Vous êtes inscrit dans <strong>{myQueuesCount}</strong> file(s). Personnes devant vous: <strong>{personsAhead}</strong>.</p>
                <div className="mt-4">
                  <Button onClick={() => setCurrentPage('waiting')}>Voir mes files</Button>
                </div>
              </div>
            </>
          );
        })()
      )}
    </div>
  );

  const renderOrganizationPage = () => (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mon Organisation</h1>
          <p className="text-gray-400">Gérez les paramètres de votre organisation</p>
        </div>
        <Button onClick={() => setShowOrgModal(true)}>
          <Plus size={20} />
          Nouvelle Organisation
        </Button>
      </div>

      {/* Organizations List */}
      <div className="grid gap-6">
        {orgsLoading ? (
          <div className="text-center py-12">
            <div className="loading-spinner mx-auto mb-4" />
            <p className="text-gray-400">Chargement des organisations...</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-12 bg-[#2A2738] rounded-2xl border border-[#00FFF7]/20">
            <Building2 className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-white mb-2">Aucune organisation</h3>
            <p className="text-gray-400 mb-6">Créez votre première organisation pour commencer</p>
            <Button onClick={() => setShowOrgModal(true)}>
              <Plus size={20} />
              Créer une organisation
            </Button>
          </div>
        ) : (
          organizations.map((org) => (
            <div key={org.id} className="bg-[#2A2738] p-6 rounded-2xl border border-[#00FFF7]/20 card-hover-effect">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#00FFF7] to-[#8C1AFF] rounded-2xl flex items-center justify-center">
                    <Building2 className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{org.name}</h3>
                    <p className="text-gray-400">{org.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => openEditOrgModal(org)}
                    variant="ghost"
                    size="sm"
                  >
                    <Edit3 size={16} />
                  </Button>
                  <Button
                    onClick={() => handleDeleteOrganization(org.id)}
                    variant="danger"
                    size="sm"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-[#1F1B2E] p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="text-[#00FFF7]" size={16} />
                    <span className="text-sm font-medium text-gray-300">Horaires</span>
                  </div>
                  <p className="text-white font-semibold">
                    {org.settings.workingHours.start} - {org.settings.workingHours.end}
                  </p>
                </div>
                
                <div className="bg-[#1F1B2E] p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="text-[#8C1AFF]" size={16} />
                    <span className="text-sm font-medium text-gray-300">Capacité Max</span>
                  </div>
                  <p className="text-white font-semibold">{org.settings.maxQueueSize} clients</p>
                </div>
                
                <div className="bg-[#1F1B2E] p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Timer className="text-[#FF6B6B]" size={16} />
                    <span className="text-sm font-medium text-gray-300">Temps Service</span>
                  </div>
                  <p className="text-white font-semibold">{org.settings.estimatedServiceTime} min</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderServicesPage = () => (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mes Services</h1>
          <p className="text-gray-400">
            {selectedOrganization ? `Services de ${selectedOrganization.name}` : 'Sélectionnez une organisation'}
          </p>
        </div>
        <Button 
          onClick={() => setShowServiceModal(true)}
          disabled={!selectedOrganization}
        >
          <Plus size={20} />
          Nouveau Service
        </Button>
      </div>

      {!selectedOrganization ? (
        <div className="text-center py-12 bg-[#2A2738] rounded-2xl border border-[#00FFF7]/20">
          <Building2 className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-white mb-2">Aucune organisation sélectionnée</h3>
          <p className="text-gray-400">Créez ou sélectionnez une organisation pour gérer vos services</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {servicesLoading ? (
            <div className="text-center py-12">
              <div className="loading-spinner mx-auto mb-4" />
              <p className="text-gray-400">Chargement des services...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 bg-[#2A2738] rounded-2xl border border-[#00FFF7]/20">
              <Settings className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-xl font-semibold text-white mb-2">Aucun service</h3>
              <p className="text-gray-400 mb-6">Créez votre premier service pour commencer</p>
              <Button onClick={() => setShowServiceModal(true)}>
                <Plus size={20} />
                Créer un service
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div key={service.id} className="bg-[#2A2738] p-6 rounded-2xl border border-[#00FFF7]/20 card-hover-effect">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        service.isActive ? 'bg-green-400/10' : 'bg-gray-400/10'
                      }`}>
                        <Settings className={service.isActive ? 'text-green-400' : 'text-gray-400'} size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{service.name}</h3>
                        <p className="text-sm text-gray-400">{service.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => openEditServiceModal(service)}
                        variant="ghost"
                        size="sm"
                      >
                        <Edit3 size={16} />
                      </Button>
                      <Button
                        onClick={() => handleDeleteService(service.id)}
                        variant="danger"
                        size="sm"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Durée estimée</span>
                      <span className="text-white font-semibold">{service.estimatedDuration} min</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Statut</span>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        service.isActive 
                          ? 'bg-green-400/10 text-green-400' 
                          : 'bg-gray-400/10 text-gray-400'
                      }`}>
                        {service.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderQueuesPage = () => (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mes Files d'Attente</h1>
          <p className="text-gray-400">
            {selectedOrganization ? `Files de ${selectedOrganization.name}` : 'Sélectionnez une organisation'}
          </p>
        </div>
      </div>

      {/* Debug Information removed */}

      {!selectedOrganization ? (
        <div className="text-center py-12 bg-[#2A2738] rounded-2xl border border-[#00FFF7]/20">
          <Building2 className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-white mb-2">Aucune organisation sélectionnée</h3>
          <p className="text-gray-400">Créez ou sélectionnez une organisation pour gérer vos files</p>
        </div>
      ) : (
        <div className="space-y-6">
          {servicesLoading || queuesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading-spinner w-8 h-8" />
              <span className="ml-3 text-gray-400">Chargement des files d'attente...</span>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">Aucun service trouvé.</p>
              <p className="text-sm text-gray-500">Créez d'abord des services pour gérer les files d'attente.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {services
                .filter(service => service.isActive)
                .map(service => {
                  // Trouver ou créer la file pour ce service
                  const queue = queues.find(q => q.serviceId === service.id);
                  
                  const orgForService = organizations.find(o => o.id === service.organizationId);

                  // If there's no queue for this service, show a placeholder card.
                  if (!queue) {
                    return (
                      <div key={service.id} className="bg-[#2A2738] p-6 rounded-2xl border border-[#00FFF7]/20">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-gray-700/20`}>
                              {getStatusIcon('open')}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white">{service.name}</h3>
                              <p className="text-gray-400">Aucune file créée pour ce service</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {orgForService && user && user.uid === orgForService.ownerId ? (
                              <Button
                                onClick={async () => {
                                  try {
                                    await createQueue({
                                      serviceId: service.id,
                                      organizationId: service.organizationId,
                                      status: 'open',
                                      currentNumber: 0,
                                      totalServed: 0,
                                      estimatedWaitTime: service.estimatedDuration,
                                      clients: []
                                    });
                                  } catch (error) {
                                    console.error('Erreur création file:', error);
                                  }
                                }}
                              >
                                <Plus size={16} />
                                Créer la file
                              </Button>
                            ) : (
                              <Button disabled size="sm">
                                Rejoindre
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={service.id} className="bg-[#2A2738] p-6 rounded-2xl border border-[#00FFF7]/20 flex flex-col h-auto">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                            queue.status === 'open' ? 'bg-green-400/10' :
                            queue.status === 'paused' ? 'bg-yellow-400/10' : 'bg-red-400/10'
                          }`}>
                            {getStatusIcon(queue.status)}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">{service.name}</h3>
                            <p className="text-gray-400">
                              {queue.clients.length} clients • {queue.estimatedWaitTime}min d'attente
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Button
                            onClick={() => handleToggleQueueStatus(queue.id, queue.status)}
                            variant={queue.status === 'open' ? 'secondary' : 'primary'}
                            size="sm"
                          >
                            {queue.status === 'open' ? <Pause size={16} /> : <Play size={16} />}
                            {queue.status === 'open' ? 'Pause' : 'Reprendre'}
                          </Button>
                          
                          <Button
                            onClick={() => handleCallNext(queue.id)}
                            disabled={queue.clients.length === 0 || queue.status !== 'open'}
                            size="sm"
                          >
                            <Volume2 size={16} />
                            Appeler
                          </Button>
                        </div>
                      </div>
                      
                      {/* Queue Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-[#1F1B2E] p-4 rounded-xl text-center">
                          <p className="text-2xl font-bold text-[#00FFF7]">{queue.currentNumber}</p>
                          <p className="text-gray-400 text-sm">Numéro Actuel</p>
                        </div>
                        <div className="bg-[#1F1B2E] p-4 rounded-xl text-center">
                          <p className="text-2xl font-bold text-[#8C1AFF]">{queue.clients.length}</p>
                          <p className="text-gray-400 text-sm">En Attente</p>
                        </div>
                        <div className="bg-[#1F1B2E] p-4 rounded-xl text-center">
                          <p className="text-2xl font-bold text-[#FF6B6B]">{queue.totalServed}</p>
                          <p className="text-gray-400 text-sm">Traités</p>
                        </div>
                        <div className="bg-[#1F1B2E] p-4 rounded-xl text-center">
                          <p className="text-2xl font-bold text-yellow-400">{queue.estimatedWaitTime}min</p>
                          <p className="text-gray-400 text-sm">Temps Moyen</p>
                        </div>
                      </div>
                      
                      {/* Clients List */}
                          <div className="space-y-3 mt-4 md:mt-auto">
                        <h4 className="text-lg font-semibold text-white">Clients en attente</h4>
                            {queue.clients.length === 0 ? (
                              <p className="text-gray-400 text-center py-4">Aucun client en attente</p>
                            ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {queue.clients.map((client) => (
                                  <div key={client.id} className="flex items-center justify-between p-3 bg-[#1F1B2E] rounded-lg">
                                <div className="flex items-center gap-4">
                                  <div className="w-8 h-8 bg-gradient-to-r from-[#00FFF7] to-[#8C1AFF] rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">{client.position}</span>
                                  </div>
                                  <div>
                                    <p className="text-white font-medium">{client.userName}</p>
                                    <p className="text-gray-400 text-sm">{client.userPhone}</p>
                                  </div>
                                </div>
                                <div className="text-right flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="text-white font-medium">{client.estimatedTime}</p>
                                    <p className={`text-xs px-2 py-1 rounded-lg ${
                                      client.status === 'waiting' ? 'bg-yellow-400/10 text-yellow-400' :
                                      client.status === 'called' ? 'bg-green-400/10 text-green-400' :
                                      client.status === 'served' ? 'bg-blue-400/10 text-blue-400' :
                                      'bg-red-400/10 text-red-400'
                                    }`}>
                                      {client.status === 'waiting' ? 'En attente' :
                                       client.status === 'called' ? 'Appel\u00e9' :
                                       client.status === 'served' ? 'Servi' : 'Annul\u00e9'}
                                    </p>
                                  </div>
                                  <div>
                                    <Button size="sm" onClick={() => speak(`${client.userName}, veuillez vous rapprocher.`)}>
                                      <Play size={14} />
                                      Prononcer
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderWaitingPage = () => (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mes Files d'Attente</h1>
          <p className="text-gray-400">Suivez vos positions en temps réel</p>
        </div>
        <Button onClick={() => setShowJoinQueueModal(true)}>
          <Plus size={20} />
          Rejoindre une file
        </Button>
      </div>

      {/* Current Queues */}
      <div className="space-y-6">
        {queues.filter(queue => 
          queue.clients.some(client => client.userId === user?.uid)
        ).length === 0 ? (
          <div className="text-center py-12 bg-[#2A2738] rounded-2xl border border-[#00FFF7]/20">
            <Clock className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-white mb-2">Aucune file d'attente</h3>
            <p className="text-gray-400 mb-6">Vous n'êtes dans aucune file d'attente actuellement</p>
            <Button onClick={() => setShowJoinQueueModal(true)}>
              <Plus size={20} />
              Rejoindre une file
            </Button>
          </div>
        ) : (
          queues
            .filter(queue => queue.clients.some(client => client.userId === user?.uid))
            .map((queue) => {
              const myPosition = queue.clients.find(client => client.userId === user?.uid);
              if (!myPosition) return null;
              
              const service = serviceMap[queue.serviceId] || services.find(s => s.id === queue.serviceId);
              const org = organizations.find(o => o.id === queue.organizationId);

              return (
                <div key={queue.id} className="bg-[#2A2738] p-6 rounded-2xl border border-[#00FFF7]/20">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#00FFF7] to-[#8C1AFF] rounded-2xl flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">{myPosition.position}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{service?.name || 'Service'} — Position #{myPosition.position}</h3>
                        <p className="text-gray-400">{org?.name || 'Organisation'} • File #{queue.currentNumber}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#00FFF7]">{myPosition.estimatedTime}</p>
                      <p className="text-gray-400">Heure estimée</p>
                    </div>
                  </div>
                  {/* Service description and actions */}
                  <div className="mb-4 text-gray-300">
                    <p className="text-sm">{service?.description || 'Aucune description fournie pour ce service.'}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#1F1B2E] p-4 rounded-xl text-center">
                      <p className="text-lg font-bold text-white">{myPosition.position - 1}</p>
                      <p className="text-gray-400 text-sm">Personnes devant</p>
                    </div>
                    <div className="bg-[#1F1B2E] p-4 rounded-xl text-center">
                      <p className="text-lg font-bold text-white">{queue.estimatedWaitTime}min</p>
                      <p className="text-gray-400 text-sm">Temps d'attente</p>
                    </div>
                    <div className="bg-[#1F1B2E] p-4 rounded-xl text-center">
                      <p className={`text-lg font-bold ${getStatusColor(myPosition.status)}`}>
                        {myPosition.status === 'waiting' ? 'En attente' :
                         myPosition.status === 'called' ? 'Appelé' :
                         myPosition.status === 'served' ? 'Servi' : 'Annulé'}
                      </p>
                      <p className="text-gray-400 text-sm">Statut</p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-3">
                    <Button
                      onClick={() => handleLeaveQueue(queue.id)}
                      variant="danger"
                      disabled={leavingQueueId === queue.id}
                    >
                      {leavingQueueId === queue.id ? 'Quit en cours...' : 'Quitter la file'}
                    </Button>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );

  const renderNotificationsPage = () => (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400">Restez informé de l'activité de vos files</p>
        </div>
        <Button variant="ghost" size="sm">
          Tout marquer comme lu
        </Button>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {mockNotifications.map((notification) => (
          <div key={notification.id} className={`p-4 rounded-xl border transition-all duration-200 ${
            notification.read 
              ? 'bg-[#2A2738] border-gray-600' 
              : 'bg-[#2A2738] border-[#00FFF7]/30 shadow-lg shadow-[#00FFF7]/10'
          }`}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-white">{notification.title}</h3>
                  <span className="text-xs text-gray-400">{notification.time}</span>
                </div>
                <p className="text-gray-300 text-sm">{notification.message}</p>
              </div>
              {!notification.read && (
                <div className="w-2 h-2 bg-[#00FFF7] rounded-full flex-shrink-0 mt-2" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStatsPage = () => (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Statistiques</h1>
          <p className="text-gray-400">Analysez les performances de vos services</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            <Calendar size={16} />
            Cette semaine
          </Button>
          <Button variant="ghost" size="sm" onClick={() => exportStats('csv')}>
            <Eye size={16} />
            Exporter CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={() => exportStats('xlsx')}>
            <Save size={16} />
            Exporter XLSX
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#2A2738] p-6 rounded-2xl border border-[#00FFF7]/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#00FFF7]/10 rounded-xl flex items-center justify-center">
              <Users className="text-[#00FFF7]" size={24} />
            </div>
            <TrendingUp className="text-green-400" size={20} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">
            {queues.reduce((total, queue) => total + queue.totalServed, 0)}
          </h3>
          <p className="text-gray-400 text-sm">Clients traités</p>
          <p className="text-green-400 text-xs mt-1">+15% vs semaine dernière</p>
        </div>

        <div className="bg-[#2A2738] p-6 rounded-2xl border border-[#8C1AFF]/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#8C1AFF]/10 rounded-xl flex items-center justify-center">
              <Clock className="text-[#8C1AFF]" size={24} />
            </div>
            <TrendingUp className="text-green-400" size={20} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">
            {Math.round(queues.reduce((total, queue) => total + queue.estimatedWaitTime, 0) / Math.max(queues.length, 1))}min
          </h3>
          <p className="text-gray-400 text-sm">Temps moyen</p>
          <p className="text-green-400 text-xs mt-1">-8% vs semaine dernière</p>
        </div>

        <div className="bg-[#2A2738] p-6 rounded-2xl border border-[#FF6B6B]/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#FF6B6B]/10 rounded-xl flex items-center justify-center">
              <BarChart3 className="text-[#FF6B6B]" size={24} />
            </div>
            <TrendingUp className="text-green-400" size={20} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">96%</h3>
          <p className="text-gray-400 text-sm">Taux de satisfaction</p>
          <p className="text-green-400 text-xs mt-1">+2% vs semaine dernière</p>
        </div>

        <div className="bg-[#2A2738] p-6 rounded-2xl border border-yellow-400/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-400/10 rounded-xl flex items-center justify-center">
              <Timer className="text-yellow-400" size={24} />
            </div>
            <TrendingUp className="text-red-400" size={20} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">2.3%</h3>
          <p className="text-gray-400 text-sm">Taux d'abandon</p>
          <p className="text-red-400 text-xs mt-1">+0.5% vs semaine dernière</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          {/* Build hourly data from queues: prefer real timestamps (joinedAt/servedAt) */}
          {userType === 'owner' ? (
            <HourlyBarChart
              data={(() => {
                // Build 12 buckets across the day (every 2 hours)
                const labels = ['00h','02h','04h','06h','08h','10h','12h','14h','16h','18h','20h','22h'];
                const buckets: number[] = Array(labels.length).fill(0);

                // Prefer servedAt (historical activity), fallback to joinedAt
                queues.forEach(q => {
                  q.clients.forEach((c) => {
                    const client = c as QueueClient;
                    const ts = client.servedAt || client.joinedAt;
                    if (!ts || !('toDate' in ts)) return;
                    const date = ts.toDate();
                    const hour = date.getHours();
                    const idx = Math.floor(hour / 2) % labels.length;
                    buckets[idx] += 1;
                  });
                });

                // If buckets are all zero (no timestamps), fallback to simple distribution using queue sizes
                const allZero = buckets.every(v => v === 0);
                if (allZero) {
                  const base = queues.reduce((acc, q) => acc + q.clients.length, 0);
                  return labels.map((l, i) => ({ label: l, value: Math.round(((i + 1) / labels.length) * base * (0.6 + (i % 3) * 0.25)) }));
                }

                return labels.map((l, i) => ({ label: l, value: buckets[i] }));
              })()}
            />
          ) : (
            <div className="bg-[#2A2738] p-4 rounded-2xl border border-[#00FFF7]/20">
              <h4 className="text-white font-semibold">Affluence par heure</h4>
              <p className="text-gray-400 text-sm mt-3">Disponible pour les propriétaires</p>
            </div>
          )}
        </div>

        <div>
          {userType === 'owner' ? (
            <AreaLineChart
              data={(() => {
                // Build 24 points using recent servedAt timestamps to compute hourly average wait time
                const hours: number[] = Array(24).fill(0);
                const counts: number[] = Array(24).fill(0);

                queues.forEach(q => {
                  q.clients.forEach(c => {
                    const served = (c as QueueClient).servedAt;
                    if (!served || !('toDate' in served)) return;
                    const d = served.toDate();
                    const h = d.getHours();
                    // Use estimatedWaitTime from queue as proxy for wait-time if needed
                    hours[h] += q.estimatedWaitTime || 0;
                    counts[h] += 1;
                  });
                });

                const points: { label: string; value: number }[] = [];
                for (let i = 0; i < 24; i++) {
                  const avg = counts[i] ? Math.round(hours[i] / counts[i]) : 0;
                  points.push({ label: `${i}h`, value: avg });
                }

                // If no served timestamps, fallback to estimatedWaitTime trend (mock smooth sine)
                const allZero = points.every(p => p.value === 0);
                if (allZero) {
                  const est = Math.round(queues.reduce((acc, q) => acc + q.estimatedWaitTime, 0) / Math.max(1, queues.length));
                  return Array.from({ length: 24 }).map((_, i) => ({ label: `${i}h`, value: Math.round(est * (0.6 + 0.5 * Math.abs(Math.sin(i / 24 * Math.PI)))) }));
                }

                return points;
              })()}
            />
          ) : (
            <div className="bg-[#2A2738] p-4 rounded-2xl border border-[#8C1AFF]/20">
              <h4 className="text-white font-semibold">Temps d'attente moyen</h4>
              <p className="text-gray-400 text-sm mt-3">Disponible pour les propriétaires</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const exportStats = async (format: 'csv' | 'xlsx') => {
    try {
      // Build rows from queues
  type Row = { [k: string]: string | number | boolean | null | undefined };
  const rows: Array<Row> = queues.map(q => {
        const service = serviceMap[q.serviceId] || services.find(s => s.id === q.serviceId);
        const org = organizations.find(o => o.id === q.organizationId);
        return {
          queueId: q.id,
          organization: org?.name || q.organizationId,
          service: service?.name || q.serviceId,
          status: q.status,
          clientsWaiting: q.clients.length,
          currentNumber: q.currentNumber,
          totalServed: q.totalServed,
          estimatedWaitTime: q.estimatedWaitTime
        };
      });

      if (format === 'csv') {
        const header = Object.keys(rows[0] || {}).join(',') + '\n';
        const csv = header + rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stats_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Try to dynamically import xlsx. If unavailable, fallback to CSV download.
        try {
          const XLSX = (await import('xlsx')) as typeof import('xlsx');
          const ws = XLSX.utils.json_to_sheet(rows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Stats');
          XLSX.writeFile(wb, `stats_${new Date().toISOString().slice(0,10)}.xlsx`);
        } catch (err) {
          console.warn('xlsx module not available or failed to load, falling back to CSV', err);
          const header = Object.keys(rows[0] || {}).join(',') + '\n';
          const csv = header + rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `stats_${new Date().toISOString().slice(0,10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (e) {
      console.error('Export error', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#1F1B2E] text-white">
      {currentPage === 'home' && renderHomePage()}
      {currentPage === 'login' && renderLoginPage()}
      {(currentPage === 'dashboard' || currentPage === 'organization' || currentPage === 'services' || currentPage === 'queues' || currentPage === 'waiting' || currentPage === 'notifications' || currentPage === 'stats') && (
        <div className="flex min-h-screen">
          {renderSidebar()}
          <div className="flex-1 lg:ml-0 min-h-screen overflow-auto">
            {renderHeader()}
            {currentPage === 'dashboard' && renderDashboard()}
            {currentPage === 'organization' && renderOrganizationPage()}
            {currentPage === 'services' && renderServicesPage()}
            {currentPage === 'queues' && renderQueuesPage()}
            {currentPage === 'waiting' && renderWaitingPage()}
            {currentPage === 'notifications' && renderNotificationsPage()}
            {currentPage === 'stats' && renderStatsPage()}
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={showOrgModal}
        onClose={() => {
          setShowOrgModal(false);
          setEditingOrg(null);
          setOrgForm({
            name: '',
            description: '',
            workingHours: { start: '09:00', end: '18:00' },
            maxQueueSize: 50,
            estimatedServiceTime: 15
          });
        }}
        title={editingOrg ? 'Modifier l\'organisation' : 'Nouvelle organisation'}
      >
        <div className="space-y-6">
            <FormField
              label="Nom de l'organisation"
              value={orgForm.name}
              onChange={(value) => setOrgForm(prev => ({ ...prev, name: value }))}
              placeholder="Mon entreprise"
              required
            />
          
            <FormField
              label="Description"
              value={orgForm.description}
              onChange={(value) => setOrgForm(prev => ({ ...prev, description: value }))}
              placeholder="Description de votre organisation"
              rows={3}
            />
          
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Heure d'ouverture"
                type="time"
                value={orgForm.workingHours.start}
                onChange={(value) => setOrgForm(prev => ({ 
                  ...prev, 
                  workingHours: { ...prev.workingHours, start: value }
                }))}
              />
            
              <FormField
                label="Heure de fermeture"
                type="time"
                value={orgForm.workingHours.end}
                onChange={(value) => setOrgForm(prev => ({ 
                  ...prev, 
                  workingHours: { ...prev.workingHours, end: value }
                }))}
              />
            </div>
          
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Capacité maximale"
                type="number"
                value={orgForm.maxQueueSize.toString()}
                onChange={(value) => setOrgForm(prev => ({ ...prev, maxQueueSize: parseInt(value) || 50 }))}
                placeholder="50"
              />
            
              <FormField
                label="Temps de service (min)"
                type="number"
                value={orgForm.estimatedServiceTime.toString()}
                onChange={(value) => setOrgForm(prev => ({ ...prev, estimatedServiceTime: parseInt(value) || 15 }))}
                placeholder="15"
              />
            </div>
          
            <div className="flex gap-3 pt-4">
              <Button
                onClick={editingOrg ? handleUpdateOrganization : handleCreateOrganization}
                className="flex-1"
              >
                <Save size={20} />
                {editingOrg ? 'Mettre à jour' : 'Créer'}
              </Button>
              <Button
                onClick={() => {
                  setShowOrgModal(false);
                  setEditingOrg(null);
                }}
                variant="ghost"
              >
                Annuler
              </Button>
            </div>
          </div>
      </Modal>

      <Modal
        isOpen={showServiceModal}
        onClose={() => {
          setShowServiceModal(false);
          setEditingService(null);
          setServiceForm({
            name: '',
            description: '',
            estimatedDuration: 15,
            isActive: true
          });
        }}
        title={editingService ? 'Modifier le service' : 'Nouveau service'}
      >
        <div className="space-y-6">
          <FormField
            label="Nom du service"
            value={serviceForm.name}
            onChange={(value) => setServiceForm(prev => ({ ...prev, name: value }))}
            placeholder="Consultation générale"
            required
          />
          
          <FormField
            label="Description"
            value={serviceForm.description}
            onChange={(value) => setServiceForm(prev => ({ ...prev, description: value }))}
            placeholder="Description du service"
            rows={3}
          />
          
          <FormField
            label="Durée estimée (minutes)"
            type="number"
            value={serviceForm.estimatedDuration.toString()}
            onChange={(value) => setServiceForm(prev => ({ ...prev, estimatedDuration: parseInt(value) || 15 }))}
            placeholder="15"
          />
          
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={serviceForm.isActive}
              onChange={(e) => setServiceForm(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 text-[#00FFF7] bg-[#1F1B2E] border-gray-600 rounded focus:ring-[#00FFF7] focus:ring-2"
            />
            <label htmlFor="isActive" className="text-gray-300">
              Service actif
            </label>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              onClick={editingService ? handleUpdateService : handleCreateService}
              className="flex-1"
            >
              <Save size={20} />
              {editingService ? 'Mettre à jour' : 'Créer'}
            </Button>
            <Button
              onClick={() => {
                setShowServiceModal(false);
                setEditingService(null);
              }}
              variant="ghost"
            >
              Annuler
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showJoinQueueModal}
        onClose={() => {
          setShowJoinQueueModal(false);
          setSelectedQueue(null);
          setJoinQueueForm({ name: '', phone: '', email: '' });
        }}
        title="Rejoindre une file d'attente"
      >
        <div className="space-y-6">
          <div className="bg-[#1F1B2E] p-4 rounded-xl">
            <p className="text-gray-400 text-sm mb-2">Sélectionnez une file d'attente disponible</p>
            <div className="space-y-2">
              {queues.filter(q => q.status === 'open').map((queue) => {
                const service = serviceMap[queue.serviceId] || services.find(s => s.id === queue.serviceId);
                const org = organizations.find(o => o.id === queue.organizationId);
                const alreadyJoined = !!user && queue.clients.some(c => c.userId === user.uid);

                return (
                  <div key={queue.id} className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                    selectedQueue?.id === queue.id ? 'border-[#00FFF7] bg-[#00FFF7]/5' : 'border-gray-600'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{service?.name || 'Service'}</p>
                        <p className="text-gray-400 text-sm">{org?.name || 'Organisation'} • {queue.clients.length} personnes</p>
                        {service?.description && (
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">{service.description}</p>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <p className="text-[#00FFF7] font-medium">{queue.estimatedWaitTime}min</p>
                        {!user ? (
                          <Button size="sm" onClick={() => setCurrentPage('login')}>Se connecter</Button>
                        ) : alreadyJoined ? (
                          <Button size="sm" disabled>Déjà rejoint</Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => setSelectedQueue(queue)}>Rejoindre</Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedQueue?.id === queue.id && (
                      <div className="mt-3 bg-[#17151f] p-3 rounded">
                        {service?.description && (
                          <div className="mb-3 text-gray-300">
                            <p className="text-sm">{service.description}</p>
                          </div>
                        )}
                        <FormField
                          label="Votre nom"
                          value={joinQueueForm.name}
                          onChange={(value) => setJoinQueueForm(prev => ({ ...prev, name: value }))}
                          placeholder="Nom complet"
                          required
                        />

                        <FormField
                          label="Téléphone"
                          type="tel"
                          value={joinQueueForm.phone}
                          onChange={(value) => setJoinQueueForm(prev => ({ ...prev, phone: value }))}
                          placeholder="+33 6 12 34 56 78"
                          required
                        />

                        <FormField
                          label="Email (optionnel)"
                          type="email"
                          value={joinQueueForm.email}
                          onChange={(value) => setJoinQueueForm(prev => ({ ...prev, email: value }))}
                          placeholder="votre@email.com"
                        />

                        <div className="flex gap-3 pt-4">
                          <Button
                            onClick={handleJoinQueue}
                            className="flex-1"
                            disabled={!joinQueueForm.name || !joinQueueForm.phone || !user}
                          >
                            <Plus size={20} />
                            Rejoindre la file
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedQueue(null);
                              setJoinQueueForm({ name: '', phone: '', email: '' });
                            }}
                            variant="ghost"
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;