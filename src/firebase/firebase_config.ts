import { initializeApp, cert, getApp, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getMessaging, Messaging } from 'firebase-admin/messaging'

// 💡 วิธีโหลด JSON แบบ TypeScript (ต้องตั้งค่าใน tsconfig.json ด้วย)
import serviceAccount from '../../serviceAccountKey.json';

const firebaseAdminConfig = {
  credential: cert(serviceAccount as any), // หลบ Type เช็คของ JSON เล็กน้อย
};

// 💡 ป้องกันการ Initialize ซ้ำ (สำคัญมากใน Node.js/Next.js dev mode)
const app: App = getApps().length === 0
  ? initializeApp(firebaseAdminConfig)
  : getApp();

export const auth: Auth = getAuth(app);
export const adminMessaging: Messaging = getMessaging(app)

