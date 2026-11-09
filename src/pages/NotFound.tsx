import { Link } from 'react-router-dom';
import { Button, EmptyState } from '../components/ui';

export default function NotFound() {
  return <EmptyState title="Halaman tidak ditemukan" description="Alamat yang dibuka tidak ada di CMS." action={<Link to="/"><Button>Ke dashboard</Button></Link>} />;
}
