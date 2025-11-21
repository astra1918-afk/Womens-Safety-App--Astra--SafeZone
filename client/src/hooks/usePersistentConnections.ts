import { useState, useEffect } from 'react';

interface FamilyConnection {
  id: number;
  parentUserId: string;
  childUserId: string;
  relationshipType: string;
  status: string;
  permissions: any;
  inviteCode: string | null;
  inviteExpiry: Date | null;
  createdAt: Date | null;
  acceptedAt: Date | null;
}

interface ChildProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastSeen: string;
  status: 'safe' | 'emergency' | 'offline';
  currentLocation?: {
    lat: number;
    lng: number;
    address: string;
    timestamp: string;
  };
}

export function usePersistentConnections() {
  const [connections, setConnections] = useState<FamilyConnection[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);

  // Load persisted connections on mount
  useEffect(() => {
    loadPersistedData();
  }, []);

  const loadPersistedData = () => {
    try {
      // Load family connections
      const storedConnections = localStorage.getItem('sakhi_family_connections');
      if (storedConnections) {
        const parsedConnections = JSON.parse(storedConnections);
        setConnections(parsedConnections);
      }

      // Load children profiles
      const storedChildren = localStorage.getItem('sakhi_children_profiles');
      if (storedChildren) {
        const parsedChildren = JSON.parse(storedChildren);
        setChildren(parsedChildren);
      }
    } catch (error) {
      console.log('No persisted connections found, starting fresh');
    }
  };

  const persistConnection = (connection: FamilyConnection) => {
    const updatedConnections = [...connections, connection];
    setConnections(updatedConnections);
    localStorage.setItem('sakhi_family_connections', JSON.stringify(updatedConnections));

    // If this is an accepted connection, create child profile
    if (connection.status === 'accepted') {
      const childProfile: ChildProfile = {
        id: connection.childUserId,
        name: `Child User ${connection.childUserId}`,
        email: `${connection.childUserId}@example.com`,
        phone: '+1234567890',
        lastSeen: new Date().toISOString(),
        status: 'safe'
      };

      const updatedChildren = [...children, childProfile];
      setChildren(updatedChildren);
      localStorage.setItem('sakhi_children_profiles', JSON.stringify(updatedChildren));
    }
  };

  const updateChildStatus = (childId: string, status: 'safe' | 'emergency' | 'offline', location?: any) => {
    const updatedChildren = children.map(child => 
      child.id === childId 
        ? { 
            ...child, 
            status, 
            lastSeen: new Date().toISOString(),
            currentLocation: location || child.currentLocation 
          }
        : child
    );
    setChildren(updatedChildren);
    localStorage.setItem('sakhi_children_profiles', JSON.stringify(updatedChildren));
  };

  const getConnectedChildren = (): ChildProfile[] => {
    return children.filter(child => 
      connections.some(conn => 
        conn.childUserId === child.id && conn.status === 'accepted'
      )
    );
  };

  const clearPersistedData = () => {
    localStorage.removeItem('sakhi_family_connections');
    localStorage.removeItem('sakhi_children_profiles');
    setConnections([]);
    setChildren([]);
  };

  return {
    connections,
    children: getConnectedChildren(),
    persistConnection,
    updateChildStatus,
    loadPersistedData,
    clearPersistedData
  };
}