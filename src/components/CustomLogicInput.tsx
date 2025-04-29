import React from "react";
import Editor from "@monaco-editor/react";

interface CustomLogicInputProps {
  value: string;
  onChange: (value: string) => void;
  title: string;
  height?: string;
}

export const CustomLogicInput: React.FC<CustomLogicInputProps> = ({ value, onChange, title, height = "200px" }) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{title}</label>
      <div className="border rounded-md overflow-hidden">
        <Editor
          height={height}
          defaultLanguage="typescript"
          value={value}
          onChange={(value) => onChange(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            theme: "vs-dark",
          }}
        />
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Return a boolean value. Available variables: currentPosition, config, currentPnL, priceGapPercent
      </p>
    </div>
  );
};
