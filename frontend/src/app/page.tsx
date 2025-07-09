import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect the user to the main review dashboard
  redirect('/review');
}