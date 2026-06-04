import { cn } from '~/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  ref?: React.Ref<HTMLInputElement>;
}

function Input({ className, type, ref, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-wisp-elements-border bg-wisp-elements-background px-3 py-2 text-sm ring-offset-wisp-elements-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-wisp-elements-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wisp-elements-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
}

export { Input };
