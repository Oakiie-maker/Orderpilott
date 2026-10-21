import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Restaurant, RestaurantMember, RestaurantRole } from '@/types/database';

interface RestaurantContextValue {
  restaurants: Restaurant[];
  activeRestaurant: Restaurant | null;
  membership: RestaurantMember | null;
  role: RestaurantRole | null;
  loading: boolean;
  setActiveRestaurant: (restaurant: Restaurant) => void;
  refreshRestaurants: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextValue | undefined>(undefined);

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [activeRestaurant, setActiveRestaurantState] = useState<Restaurant | null>(null);
  const [membership, setMembership] = useState<RestaurantMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRestaurants([]);
      setActiveRestaurantState(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      const { data: memberData, error: memberError } = await supabase
        .from('restaurant_members')
        .select(`
          *,
          restaurant:restaurants(*)
        `)
        .eq('user_id', user.id);

      if (!mounted) return;

      if (memberError) {
        console.error('Error loading restaurants:', memberError);
        setLoading(false);
        return;
      }

      const userRestaurants = (memberData || [])
        .map((m) => m.restaurant as unknown as Restaurant)
        .filter(Boolean);

      setRestaurants(userRestaurants);

      if (userRestaurants.length > 0) {
        const stored = localStorage.getItem('activeRestaurantId');
        const found = stored
          ? userRestaurants.find((r) => r.id === stored)
          : userRestaurants[0];
        const active = found || userRestaurants[0];
        setActiveRestaurantState(active);

        const memberInfo = (memberData || []).find(
          (m) => m.restaurant_id === active?.id
        );
        setMembership(memberInfo as RestaurantMember | null);
      } else {
        setActiveRestaurantState(null);
        setMembership(null);
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  const setActiveRestaurant = (restaurant: Restaurant) => {
    localStorage.setItem('activeRestaurantId', restaurant.id);
    setActiveRestaurantState(restaurant);
    // Reload membership for this restaurant
    if (user) {
      supabase
        .from('restaurant_members')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          setMembership(data as RestaurantMember | null);
        });
    }
  };

  const refreshRestaurants = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('restaurant_members')
      .select(`*, restaurant:restaurants(*)`)
      .eq('user_id', user.id);

    const userRestaurants = (data || [])
      .map((m) => m.restaurant as unknown as Restaurant)
      .filter(Boolean);
    setRestaurants(userRestaurants);
  };

  return (
    <RestaurantContext.Provider
      value={{
        restaurants,
        activeRestaurant,
        membership,
        role: membership?.role ?? null,
        loading,
        setActiveRestaurant,
        refreshRestaurants,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurant must be used within RestaurantProvider');
  }
  return context;
}
