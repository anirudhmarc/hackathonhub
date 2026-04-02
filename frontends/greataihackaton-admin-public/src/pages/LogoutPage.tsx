import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { Spinner } from '@/components/ui/spinner';

const LogoutPage: React.FC = () => {
	const navigate = useNavigate();
	const { removeUser } = useAuth();

	useEffect(() => {
		const doLogout = async () => {
			await removeUser();
			localStorage.clear();
			sessionStorage.clear();
			navigate('/login', { replace: true });
		};
		doLogout();
	}, [navigate, removeUser]);

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
			<Spinner size="lg" />
			<p className="mt-4 text-lg">Completing sign-out... Redirecting to sign-in page.</p>
		</div>
	);
};

export default LogoutPage;