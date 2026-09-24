"use client";

export const quarterHours = Array.from(
  { length: 96 },
  (_, i) =>
    `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`,
);

export function TimePicker({
  name,
  value,
  onChange,
  defaultValue,
  label,
  disabled = false,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  label?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const current = value ?? defaultValue;
  // Preserve previously saved working hours even when they are not on a quarter hour.
  const options =
    current && !quarterHours.includes(current)
      ? [...quarterHours, current].sort()
      : quarterHours;
  return (
    <select
      name={name}
      aria-label={label}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      required
      disabled={disabled}
    >
      <option value="">Escolha o horário</option>
      {options.map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </select>
  );
}
