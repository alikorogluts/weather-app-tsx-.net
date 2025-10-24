import { useState, useEffect } from 'react';

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface GeolocationState {
    loading: boolean;
    error: string | null;
    coords: Coordinates | null;
    address: string | null; // Adres bilgisi
    retry: () => void;
}

const ERROR_DISPLAY_DURATION_MS = 5000;

export const useGeolocation = (): GeolocationState => {
    const [state, setState] = useState<GeolocationState>({
        loading: true,
        error: null,
        coords: null,
        address: null,
        retry: () => setShouldRetry(true),
    });

    const [shouldRetry, setShouldRetry] = useState(true);

   const fetchAddress = async (lat: number, lng: number) => {
    try {
        // 'addressdetails=1' parametresi ile detaylı adres objesini istiyoruz.
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=tr&addressdetails=1`;
        const res = await fetch(url);
        const data = await res.json();

        if (data && data.address) {
            const addressDetails = data.address;
            
            // 💡 Kısa Adres Oluşturma Stratejisi
            // 1. Önce "city" veya "town" (İl/İlçe) var mı diye bak.
            const cityOrTown = addressDetails.city || addressDetails.town || addressDetails.county; 
            
            // 2. Eğer İl/İlçe varsa ve ek olarak Eyalet/Bölge (state) de varsa, bunları birleştir.
            let shortAddress = cityOrTown;
            if (shortAddress && addressDetails.state && addressDetails.state !== shortAddress) {
                // İlçe, İl şeklinde gösterim
                shortAddress = `${shortAddress}, ${addressDetails.state}`; 
            }
            
            // Eğer yukarıdaki yöntemlerle bir şey bulunamazsa, yine de 'display_name' kullan, 
            // ama onun ilk kısmını almayı dene (aşağıdaki "Kırpma" yöntemine bak).
            if (!shortAddress) {
                const parts = data.display_name.split(', ');
                shortAddress = parts.length > 2 ? `${parts[2]}, ${parts[3]}` : data.display_name;
            }

            console.log("🏠 Kısa Adres bulundu:", shortAddress);

            setState(s => ({
                ...s,
                // UI'da gösterilecek daha kısa bilgiyi 'address' olarak kaydediyoruz.
                address: shortAddress
            }));
            
        } else {
            console.warn("⚠️ Adres bulunamadı");
        }
    } catch (err) {
        console.error("❌ Adres alınamadı:", err);
    }
};

    useEffect(() => {
        if (!shouldRetry) return;

        setState(s => ({ ...s, loading: true, error: null }));

        if (!navigator.geolocation) {
            setState(s => ({
                ...s,
                loading: false,
                error: 'Tarayıcınız konum servislerini desteklemiyor.',
            }));
            setShouldRetry(false);
            return;
        }

        const onSuccess = (position: GeolocationPosition) => {
            const coords = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            };

            setState(s => ({
                ...s,
                loading: false,
                error: null,
                coords,
            }));

            fetchAddress(coords.latitude, coords.longitude);
            setShouldRetry(false);
        };

        const onError = (error: GeolocationPositionError) => {
            let errorMessage = '';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Konum izni reddedildi.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Konum bilgisi mevcut değil.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Konum bilgisi alınırken zaman aşımı oldu.';
                    break;
                default:
                    errorMessage = 'Bilinmeyen bir hata oluştu.';
                    break;
            }

            setState(s => ({
                ...s,
                loading: false,
                error: errorMessage,
                coords: null,
                address: null,
            }));
            setShouldRetry(false);
        };

        navigator.geolocation.getCurrentPosition(onSuccess, onError, {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 0,
        });

    }, [shouldRetry]);

    // Hata mesajını otomatik temizle
    useEffect(() => {
        if (state.error) {
            const timer = setTimeout(() => {
                setState(s => ({ ...s, error: null }));
            }, ERROR_DISPLAY_DURATION_MS);
            return () => clearTimeout(timer);
        }
    }, [state.error]);

    return state;
};