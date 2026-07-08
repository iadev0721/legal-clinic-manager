import React from "react";

interface FormErrorAlertProps {
  errors: string[];
  onClose: () => void;
}

export default function FormErrorAlert({ errors, onClose }: FormErrorAlertProps) {
  if (!errors || errors.length === 0) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-sm">
      <div className="flex justify-between items-start">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="icon-[mdi--alert-circle] text-red-500 text-xl"></span>
          </div>
          <div className="ml-3">
            <h4 className="text-red-800 font-semibold mb-2">Por favor, verifica los siguientes campos:</h4>
            <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-red-500 hover:text-red-700 flex-shrink-0 ml-4 p-1 rounded-md hover:bg-red-100 transition-colors"
          type="button"
          title="Cerrar"
        >
          <span className="icon-[mdi--close] text-xl"></span>
        </button>
      </div>
    </div>
  );
}
