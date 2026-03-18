import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../context/AuthContext";
import { getAllTeams } from "../../api/services/team.service";
import toast from "react-hot-toast";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import Button from "../../components/common/Button";
import { Calendar, Eye, EyeOff } from "lucide-react";

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm Password is required"),
    team: z.string().min(1, "Please select an organization"),
    role: z.enum(["admin", "sub-admin", "volunteer"], {
      required_error: "Please select a role",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function Register({ onSuccess, switchToLogin, preSelectedTeamId = "" }) {
  // ✅ Added 'login' back so we can perform the direct redirect
  const { register: registerUser, login, user: currentUser } = useAuth(); 
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { 
      team: preSelectedTeamId || searchParams.get("team") || "",
      role: "volunteer" 
    },
  });

  const watchRole = watch("role");

  useEffect(() => {
    if (preSelectedTeamId) {
      setValue("team", preSelectedTeamId);
    }
  }, [preSelectedTeamId, setValue]);

  // ✅ Redirect if already logged in (using the central traffic controller)
  useEffect(() => {
    if (currentUser) {
      navigate("/dashboard", { replace: true });
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await getAllTeams();
        const rawTeams = Array.isArray(response) ? response : (response?.teams || response?.data?.teams || []);
        setTeams(rawTeams);
      } catch (err) {
        toast.error("Failed to load organizations");
      }
    };
    fetchTeams();
  }, []);

  const onSubmit = async (formData) => {
    setLoading(true);
    try {
      const payload = { ...formData, club: formData.team };

      // 1. Create the account
      await registerUser(payload);

      // 2. ✅ AUTO-LOGIN for "Direct Dashboard" experience
      // This is safe because your authMiddleware will block them if !isApproved
      await login(formData.email, formData.password);

      toast.success("Account created! Redirecting to dashboard...");
      
      if (onSuccess) onSuccess();
      
      // 3. ✅ NAVIGATE to the central redirector
      navigate("/dashboard", { replace: true });
      
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-indigo-600">
          <Calendar className="h-7 w-7" />
          PlannEx
        </Link>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Create account</h2>
        <p className="text-sm text-gray-500 mt-2">
          Already have an account?{" "}
          <button onClick={switchToLogin} className="text-indigo-600 font-semibold hover:underline cursor-pointer">
            Login
          </button>
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input 
            label="Full Name" 
            placeholder="John Doe" 
            error={errors.name?.message} 
            {...register("name")} 
          />
          
          <Input 
            label="Email" 
            type="email" 
            placeholder="you@example.com" 
            error={errors.email?.message} 
            {...register("email")} 
          />

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Input 
                label="Password" 
                type={passwordVisible ? "text" : "password"} 
                error={errors.password?.message} 
                {...register("password")} 
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-gray-400 cursor-pointer"
                onClick={() => setPasswordVisible(!passwordVisible)}
              >
                {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="relative flex-1">
              <Input 
                label="Confirm" 
                type={confirmVisible ? "text" : "password"} 
                error={errors.confirmPassword?.message} 
                {...register("confirmPassword")} 
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-gray-400 cursor-pointer"
                onClick={() => setConfirmVisible(!confirmVisible)}
              >
                {confirmVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Select
            label="Join Organization"
            disabled={!!preSelectedTeamId}
            options={teams?.map((t) => ({
              value: t._id,
              label: t.name,
            })) || []}
            error={errors.team?.message}
            {...register("team")}
          />

          <Select
            label="Requested Role"
            options={[
              { value: "volunteer", label: "Volunteer / Member" },
              { value: "sub-admin", label: "Sub-Admin / Manager" },
              { value: "admin", label: "Organization Admin" },
            ]}
            error={errors.role?.message}
            {...register("role")}
          />

          <Button type="submit" loading={loading} className="w-full">
            Register & Go to Dashboard
          </Button>

          <p className="text-[11px] text-gray-400 text-center italic">
            Note: You will be able to access workspace features once a platform administrator approves your role.
          </p>
        </form>
      </div>
    </div>
  );
}