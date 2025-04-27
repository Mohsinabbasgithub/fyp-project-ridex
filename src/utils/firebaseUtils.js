import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';

export const addVehicle = async (vehicleData) => {
  try {
    const docRef = await addDoc(collection(db, 'vehicles'), vehicleData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding vehicle:', error);
    throw error;
  }
};

export const updateVehicle = async (vehicleId, vehicleData) => {
  try {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    await updateDoc(vehicleRef, vehicleData);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
};

export const getVehicle = async (vehicleId) => {
  try {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const vehicleDoc = await getDoc(vehicleRef);
    if (vehicleDoc.exists()) {
      return { id: vehicleDoc.id, ...vehicleDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting vehicle:', error);
    throw error;
  }
}; 