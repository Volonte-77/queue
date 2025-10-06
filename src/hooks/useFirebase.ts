import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc,  
  onSnapshot, 
  query, 
  where,
  runTransaction,
  DocumentReference,
  DocumentSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { auth, db } from '../config/firebase';

// Types
export interface Organization {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: Timestamp;
  settings: {
    workingHours: { start: string; end: string };
    maxQueueSize: number;
    estimatedServiceTime: number;
  };
}

export interface Service {
  id: string;
  name: string;
  description: string;
  organizationId: string;
  estimatedDuration: number;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface Queue {
  id: string;
  serviceId: string;
  organizationId: string;
  status: 'open' | 'paused' | 'closed';
  currentNumber: number;
  totalServed: number;
  estimatedWaitTime: number;
  createdAt: Timestamp;
  clients: QueueClient[];
}

export interface QueueClient {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  position: number;
  joinedAt: Timestamp;
  calledAt?: Timestamp;
  servedAt?: Timestamp;
  estimatedTime: string;
  status: 'waiting' | 'called' | 'served' | 'cancelled';
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'client' | 'owner';
  organizationId?: string;
  createdAt: Timestamp;
}

// Custom hooks
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, userData: Partial<UserProfile>) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user profile in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      id: userCredential.user.uid,
      email: userCredential.user.email,
      ...userData,
      createdAt: Timestamp.now()
    });

    return userCredential.user;
  };

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, loading, signUp, signIn, logout };
};

export const useOrganizations = (userId?: string) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      // No userId -> clear data and mark loading complete
      setOrganizations([]);
      setLoading(false);
      return () => {};
    }

    const q = query(
      collection(db, 'organizations'),
      where('ownerId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Organization[];
      
      setOrganizations(orgs);
      setLoading(false);
    }, (error) => {
      console.error('useOrganizations onSnapshot error:', error);
      setOrganizations([]);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  const createOrganization = async (orgData: Omit<Organization, 'id' | 'createdAt'>) => {
    const docRef = await addDoc(collection(db, 'organizations'), {
      ...orgData,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  };

  const updateOrganization = async (id: string, updates: Partial<Organization>) => {
    await updateDoc(doc(db, 'organizations', id), updates);
  };

  const deleteOrganization = async (id: string) => {
    await deleteDoc(doc(db, 'organizations', id));
  };

  return { organizations, loading, createOrganization, updateOrganization, deleteOrganization };
};

export const useServices = (organizationId?: string) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      // No organizationId -> clear data and mark loading complete
      setServices([]);
      setLoading(false);
      return () => {};
    }

    const q = query(
      collection(db, 'services'),
      where('organizationId', '==', organizationId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const servs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Service[];
      
      setServices(servs);
      setLoading(false);
    }, (error) => {
      console.error('useServices onSnapshot error:', error);
      setServices([]);
      setLoading(false);
    });

    return unsubscribe;
  }, [organizationId]);

  const createService = async (serviceData: Omit<Service, 'id' | 'createdAt'>) => {
    const docRef = await addDoc(collection(db, 'services'), {
      ...serviceData,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    await updateDoc(doc(db, 'services', id), updates);
  };

  const deleteService = async (id: string) => {
    await deleteDoc(doc(db, 'services', id));
  };

  return { services, loading, createService, updateService, deleteService };
};

export const useQueues = (organizationId?: string) => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Distinguish between:
    // - organizationId === null -> explicitly no org selected (clear)
    // - organizationId === undefined -> subscribe to ALL queues (browse mode)
    if (organizationId === null) {
      setQueues([]);
      setLoading(false);
      return () => {};
    }

    const q = organizationId === undefined
      ? query(collection(db, 'queues'))
      : query(collection(db, 'queues'), where('organizationId', '==', organizationId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const qs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Queue[];
      
      setQueues(qs);
      setLoading(false);
    }, (error) => {
      console.error('useQueues onSnapshot error:', error);
      setQueues([]);
      setLoading(false);
    });

    return unsubscribe;
  }, [organizationId]);

  const createQueue = async (queueData: Omit<Queue, 'id' | 'createdAt'>) => {
    const docRef = await addDoc(collection(db, 'queues'), {
      ...queueData,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  };

  const updateQueue = async (id: string, updates: Partial<Queue>) => {
    await updateDoc(doc(db, 'queues', id), updates);
  };

  const joinQueue = async (queueId: string, clientData: Omit<QueueClient, 'id' | 'position' | 'joinedAt' | 'estimatedTime'>) => {
    const queueRef = doc(db, 'queues', queueId) as DocumentReference<Queue>;

    await runTransaction(db, async (transaction) => {
      const qSnap: DocumentSnapshot<Queue> = await transaction.get(queueRef);
      if (!qSnap.exists()) throw new Error('Queue not found');

      const data = qSnap.data();
      const clients: QueueClient[] = Array.isArray(data?.clients) ? (data!.clients as QueueClient[]) : [];

      const newPosition = clients.length + 1;
      const estimatedTime = new Date(Date.now() + (newPosition * (data?.estimatedWaitTime || 0) * 60000)).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      const newClient: QueueClient = {
        ...clientData,
        id: `client_${Date.now()}`,
        position: newPosition,
        joinedAt: Timestamp.now(),
        estimatedTime,
        status: 'waiting'
      };

      transaction.update(queueRef, {
        clients: [...clients, newClient]
      });
    });
  };

  const callNext = async (queueId: string) => {
    const queueRef = doc(db, 'queues', queueId) as DocumentReference<Queue>;

    await runTransaction(db, async (transaction) => {
      const qSnap: DocumentSnapshot<Queue> = await transaction.get(queueRef);
      if (!qSnap.exists()) throw new Error('Queue not found');

      const data = qSnap.data();
      const clients: QueueClient[] = Array.isArray(data?.clients) ? (data!.clients as QueueClient[]) : [];

      // Determine how to update statuses: promote first waiting -> called, called -> served
      let servedCount = 0;

      const mapped = clients.map((client) => {
        if (client.status === 'called') {
          servedCount += 1;
          return { ...client, status: 'served' as const, servedAt: Timestamp.now() };
        }
        return client;
      });

      // If the first client is waiting, mark them as called
      if (mapped.length > 0 && mapped[0].status === 'waiting') {
        mapped[0] = { ...mapped[0], status: 'called' as const, calledAt: Timestamp.now() };
      }

      // Remove served clients
      const filtered = mapped.filter(c => c.status !== 'served');

      // Reorder positions
      const reordered = filtered.map((client, index) => ({ ...client, position: index + 1 }));

      const incrementCurrent = (data?.currentNumber || 0) + servedCount;
      const incrementTotal = (data?.totalServed || 0) + servedCount;

      transaction.update(queueRef, {
        clients: reordered,
        currentNumber: incrementCurrent,
        totalServed: incrementTotal
      });
    });
  };

  const leaveQueue = async (queueId: string, userId: string) => {
    const queueRef = doc(db, 'queues', queueId) as DocumentReference<Queue>;

    await runTransaction(db, async (transaction) => {
      const qSnap: DocumentSnapshot<Queue> = await transaction.get(queueRef);
      if (!qSnap.exists()) throw new Error('Queue not found');

      const data = qSnap.data();
      const clients: QueueClient[] = Array.isArray(data?.clients) ? (data!.clients as QueueClient[]) : [];

      const index = clients.findIndex(c => c.userId === userId);
      if (index === -1) {
        // nothing to do
        return;
      }

      const [removed] = clients.splice(index, 1);

      // If the removed client was 'called', consider them served for counters and mark servedAt
      const servedIncrement = removed.status === 'called' ? 1 : 0;
      if (servedIncrement === 1) {
        removed.servedAt = Timestamp.now();
      }

      const reordered = clients.map((client, idx) => ({ ...client, position: idx + 1 }));

      transaction.update(queueRef, {
        clients: reordered,
        currentNumber: (data?.currentNumber || 0) + servedIncrement,
        totalServed: (data?.totalServed || 0) + servedIncrement
      });
    });
  };

  return { queues, loading, createQueue, updateQueue, joinQueue, callNext, leaveQueue };
};

export const useUserProfile = (userId?: string) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return () => {};
    }

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) {
        setProfile(null);
      } else {
        const data = snap.data() as Partial<UserProfile> | undefined;
        setProfile({ id: snap.id, ...(data || {}) } as UserProfile);
      }
      setLoading(false);
    }, (error) => {
      console.error('useUserProfile onSnapshot error:', error);
      setProfile(null);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  return { profile, loading };
};