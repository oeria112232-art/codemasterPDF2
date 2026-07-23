import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    updateProfile as firebaseUpdateProfile,
    reauthenticateWithCredential,
    EmailAuthProvider,
    updatePassword as firebaseUpdatePassword,
    deleteUser,
    User,
} from 'firebase/auth';
import { ref, get, set, remove } from 'firebase/database';
import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from 'firebase/storage';
import { auth, database, storage } from '../lib/firebase';

export interface Profile {
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    bio: string | null;
    is_admin?: boolean;
    created_at?: string;
    last_login?: string;
    login_count?: number;
    notifications_enabled?: boolean;
    email_notifications?: boolean;
    language_pref?: string;
    two_factor_enabled?: boolean;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, fullName: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<void>;
    uploadAvatar: (file: File) => Promise<string>;
    removeAvatar: () => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    deleteAccount: (password: string) => Promise<void>;
    trackLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signIn: async () => {},
    signUp: async () => {},
    signOut: async () => {},
    refreshProfile: async () => {},
    updateProfile: async () => {},
    uploadAvatar: async () => '',
    removeAvatar: async () => {},
    changePassword: async () => {},
    deleteAccount: async () => {},
    trackLogin: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async (userId: string) => {
        try {
            const snapshot = await get(ref(database, `profiles/${userId}`));
            if (snapshot.exists()) {
                const data = snapshot.val();
                setProfile({
                    ...data,
                });
            } else {
                const currentUser = auth.currentUser;
                const newProfile: Profile = {
                    full_name: currentUser?.displayName || currentUser?.email?.split('@')[0] || '',
                    avatar_url: currentUser?.photoURL || null,
                    phone: null,
                    bio: null,

                    is_admin: false,
                    created_at: new Date().toISOString(),
                    last_login: new Date().toISOString(),
                    login_count: 1,
                    notifications_enabled: true,
                    email_notifications: true,
                    language_pref: 'en',
                    two_factor_enabled: false,
                };
                set(ref(database, `profiles/${userId}`), newProfile).catch(() => {});
                setProfile(newProfile);
            }
        } catch (err) {
            console.warn('Could not fetch profile from database, using auth data:', err);
            const currentUser = auth.currentUser;
            setProfile({
                full_name: currentUser?.displayName || currentUser?.email?.split('@')[0] || '',
                avatar_url: currentUser?.photoURL || null,
                phone: null,
                bio: null,
                subscription_tier: 'free',
                is_admin: false,
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString(),
                login_count: 1,
                notifications_enabled: true,
                email_notifications: true,
                language_pref: 'en',
                two_factor_enabled: false,
            });
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                fetchProfile(firebaseUser.uid);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [fetchProfile]);

    const signIn = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signUp = async (email: string, password: string, fullName: string) => {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await firebaseUpdateProfile(credential.user, { displayName: fullName });
        const newProfile: Profile = {
            full_name: fullName,
            avatar_url: null,
            phone: null,
            bio: null,
            subscription_tier: 'free',
            is_admin: false,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
            login_count: 1,
            notifications_enabled: true,
            email_notifications: true,
            language_pref: 'en',
            two_factor_enabled: false,
        };
        set(ref(database, `profiles/${credential.user.uid}`), newProfile).catch(() => {
            console.warn('Could not save profile to database - check Realtime Database rules');
        });
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
        setUser(null);
        setProfile(null);
    };

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.uid);
    };

    const updateProfile = async (updates: Partial<Profile>) => {
        if (!user) return;
        const merged = { ...profile, ...updates };
        await set(ref(database, `profiles/${user.uid}`), merged);
        setProfile(prev => prev ? { ...prev, ...updates } : null);
    };

    const uploadAvatar = async (file: File): Promise<string> => {
        if (!user) throw new Error('Not authenticated');

        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            throw new Error('File size must be less than 2MB');
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Only JPEG, PNG, WebP, and GIF images are allowed');
        }

        // Compress/resize image before upload
        const compressedBlob = await compressImage(file, 400, 400, 0.85);

        // Delete old avatar if exists
        if (profile?.avatar_url && profile.avatar_url.startsWith('https://')) {
            try {
                const oldRef = storageRef(storage, `avatars/${user.uid}`);
                await deleteObject(oldRef);
            } catch {
                // Old avatar might not exist in storage, ignore
            }
        }

        const fileRef = storageRef(storage, `avatars/${user.uid}`);
        const snapshot = await uploadBytes(fileRef, compressedBlob, {
            contentType: file.type,
            customMetadata: {
                uploadedBy: user.uid,
                uploadedAt: new Date().toISOString(),
            },
        });

        const downloadURL = await getDownloadURL(snapshot.ref);

        // Update profile with the storage URL
        await set(ref(database, `profiles/${user.uid}`), {
            ...profile,
            avatar_url: downloadURL,
        });
        setProfile(prev => prev ? { ...prev, avatar_url: downloadURL } : null);

        return downloadURL;
    };

    const removeAvatar = async () => {
        if (!user) return;

        if (profile?.avatar_url && profile.avatar_url.startsWith('https://')) {
            try {
                const fileRef = storageRef(storage, `avatars/${user.uid}`);
                await deleteObject(fileRef);
            } catch {
                // File might not exist
            }
        }

        await set(ref(database, `profiles/${user.uid}`), {
            ...profile,
            avatar_url: null,
        });
        setProfile(prev => prev ? { ...prev, avatar_url: null } : null);
    };

    const changePassword = async (currentPassword: string, newPassword: string) => {
        if (!user || !user.email) throw new Error('Not authenticated');

        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await firebaseUpdatePassword(user, newPassword);
    };

    const deleteAccount = async (password: string) => {
        if (!user || !user.email) throw new Error('Not authenticated');

        // Re-authenticate first
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);

        // Delete avatar from storage
        if (profile?.avatar_url && profile.avatar_url.startsWith('https://')) {
            try {
                const fileRef = storageRef(storage, `avatars/${user.uid}`);
                await deleteObject(fileRef);
            } catch {
                // Ignore
            }
        }

        // Delete profile from database
        await remove(ref(database, `profiles/${user.uid}`));

        // Delete Firebase Auth user
        await deleteUser(user);

        setUser(null);
        setProfile(null);
    };

    const trackLogin = async () => {
        if (!user) return;
        const currentCount = (profile?.login_count || 0) + 1;
        const updates: Partial<Profile> = {
            last_login: new Date().toISOString(),
            login_count: currentCount,
        };
        await set(ref(database, `profiles/${user.uid}`), {
            ...profile,
            ...updates,
        });
        setProfile(prev => prev ? { ...prev, ...updates } : null);
    };

    return (
        <AuthContext.Provider value={{
            user, profile, loading,
            signIn, signUp, signOut,
            refreshProfile, updateProfile,
            uploadAvatar, removeAvatar,
            changePassword, deleteAccount,
            trackLogin,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Compress and resize an image file before upload.
 */
function compressImage(
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            let { width, height } = img;

            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Failed to compress image'));
                },
                file.type,
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}
