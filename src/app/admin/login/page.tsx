import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminLoginForm from './AdminLoginForm';

export default function AdminLoginPage() {
  const session = cookies().get('admin_session')?.value;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminPassword && session === adminPassword) {
    redirect('/admin');
  }

  return (
    <div style={{ paddingTop: '6rem', display: 'flex', justifyContent: 'center' }}>
      <AdminLoginForm />
    </div>
  );
}
