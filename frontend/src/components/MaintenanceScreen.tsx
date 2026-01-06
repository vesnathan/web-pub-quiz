"use client";

import { Card, CardBody } from "@nextui-org/react";

interface MaintenanceScreenProps {
  message?: string;
}

export function MaintenanceScreen({ message }: MaintenanceScreenProps) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-gray-800/50">
        <CardBody className="text-center py-12 px-8">
          <div className="text-6xl mb-6">🔧</div>
          <h1 className="text-2xl font-bold text-white mb-4">
            Down for Maintenance
          </h1>
          <p className="text-gray-400 mb-6">
            {message ||
              "We're making some improvements. Please check back in a few minutes."}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span>Working on it...</span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
