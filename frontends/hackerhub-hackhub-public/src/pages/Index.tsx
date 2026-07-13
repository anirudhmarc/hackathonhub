
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import React from "react";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="aws-gradient py-20 text-white">
        <div className="aws-container flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            AWS AI Hackathon
          </h1>
          <p className="text-xl md:text-2xl max-w-2xl mb-8">
            Build innovative AI solutions, compete with developers worldwide, and showcase your skills.
          </p>
          {!user ? (
            <div className="flex flex-col md:flex-row gap-4">
              <Button asChild size="lg" className="bg-aws-orange text-black hover:bg-aws-orange/90">
                <Link to="/register">Register Now</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          ) : (
            <Button asChild size="lg">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          )}
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 bg-aws-light">
        <div className="aws-container">
          <h2 className="text-3xl font-bold mb-10 text-center">Event Timeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="aws-card p-6">
              <div className="w-12 h-12 rounded-full bg-aws-light-blue text-white flex items-center justify-center font-bold mb-4">1</div>
              <h3 className="text-xl font-bold mb-2">Registration</h3>
              <p className="text-gray-600 mb-2">July 15 - August 1, 2025</p>
              <p>Register your team and select a problem statement to solve.</p>
            </div>
            <div className="aws-card p-6">
              <div className="w-12 h-12 rounded-full bg-aws-light-blue text-white flex items-center justify-center font-bold mb-4">2</div>
              <h3 className="text-xl font-bold mb-2">Development</h3>
              <p className="text-gray-600 mb-2">August 5 - August 25, 2025</p>
              <p>Build your solution using AWS AI services and tools.</p>
            </div>
            <div className="aws-card p-6">
              <div className="w-12 h-12 rounded-full bg-aws-light-blue text-white flex items-center justify-center font-bold mb-4">3</div>
              <h3 className="text-xl font-bold mb-2">Submission</h3>
              <p className="text-gray-600 mb-2">August 26 - August 30, 2025</p>
              <p>Submit your project and demonstration video.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="aws-container">
          <h2 className="text-3xl font-bold mb-10 text-center">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="aws-card p-6">
              <h3 className="text-xl font-bold mb-2">Team Registration</h3>
              <p>Register your team, provide member details, and get ready to compete.</p>
            </div>
            <div className="aws-card p-6">
              <h3 className="text-xl font-bold mb-2">Problem Selection</h3>
              <p>Choose from diverse AI problem statements on a first-come, first-served basis.</p>
            </div>
            <div className="aws-card p-6">
              <h3 className="text-xl font-bold mb-2">Video Submission</h3>
              <p>Submit your project demonstration video for evaluation by judges.</p>
            </div>
            <div className="aws-card p-6">
              <h3 className="text-xl font-bold mb-2">Feedback Review</h3>
              <p>Receive and review detailed feedback from industry experts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-aws-blue text-white">
        <div className="aws-container text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to participate?</h2>
          <p className="text-xl max-w-2xl mx-auto mb-8">
            Join over 1000 developers and build the next generation of AI solutions with AWS.
          </p>
          {!user ? (
            <Button asChild size="lg" className="bg-aws-orange text-black hover:bg-aws-orange/90">
              <Link to="/register">Register Your Team</Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
};

export default Index;
