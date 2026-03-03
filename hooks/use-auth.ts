import { auth } from "@/firebaseConfig";
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    User,
} from "firebase/auth";
import { useEffect, useState } from "react";

// Hook to manage authentication state
export default function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setUser(user ?? null);
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    return { user, isLoading };
}

// Function to sign up a user
export const signUp = async (email: string, password: string) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password,
        );
        return userCredential.user;
    } catch (error) {
        throw error;
    }
};

// Function to sign in a user
export const signIn = async (email: string, password: string) => {
    try {
        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password,
        );
        return userCredential.user;
    } catch (error) {
        throw error;
    }
};

// Function to log out a user
export const logOut = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        throw error;
    }
};
