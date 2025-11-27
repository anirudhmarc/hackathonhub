import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';

const LogoutPage: React.FC = () => {
	const navigate = useNavigate();

	useEffect(() => {
		localStorage.clear();
		sessionStorage.clear();
		const timer = setTimeout(() => {
			navigate('/login', { replace: true });
		}, 200);

		return () => clearTimeout(timer);
	}, [navigate]);

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
			<Spinner size="lg" />
			<p className="mt-4 text-lg">Completing sign-out... Redirecting to sign-in page.</p>
		</div>
	);
};

export default LogoutPage;