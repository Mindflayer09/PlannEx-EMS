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
import { Calendar, Eye, EyeOff, ArrowLeft } from "lucide-react";
import GoogleAuthButton from '../../components/auth/GoogleAuthButton';

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
  const { login, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const API_URL = rawApiUrl.replace(/\/$/, ""); 

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

  const formData = watch();

  useEffect(() => {
    if (preSelectedTeamId) {
      setValue("team", preSelectedTeamId);
    }
  }, [preSelectedTeamId, setValue]);

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

  // ==========================================
  // STEP 1: Validate Form & Request OTP (Manual)
  // ==========================================
  const onRequestOtp = async (data) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.message || "Failed to request code");

      toast.success("Verification code sent to your email!");
      setStep(2); 
    } catch (err) {
      toast.error(err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STEP 1.5: Handle Google Success Hand-off
  // ==========================================
  const handleGoogleSuccess = (googleData) => {
    // Basic check to ensure they selected a team before using Google
    if (!formData.team) {
      toast.error("Please select an Organization first!");
      return;
    }

    // Auto-fill the React Hook Form invisibly
    if (googleData?.email) setValue("email", googleData.email);
    if (googleData?.name) setValue("name", googleData.name);
    
    // Set dummy passwords to satisfy Zod schema requirements
    const dummyPass = "GoogleAuth_Shared_Secret_123!";
    setValue("password", dummyPass);
    setValue("confirmPassword", dummyPass);

    // Switch to OTP screen immediately!
    toast.success("Google linked! Check your email for the verification code.");
    setStep(2);
  };

  // ==========================================
  // STEP 2: Verify OTP & Create Account
  // ==========================================
  const onVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error("Please enter a 6-digit code");

    setLoading(true);
    try {
      const payload = {
        email: formData.email,
        name: formData.name,
        password: formData.password,
        teamId: formData.team, 
        role: formData.role,
        otp: otp
      };

      const response = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.message || "Invalid verification code");

      toast.success("Account created and verified!");
      await login(formData.email, formData.password);

      if (onSuccess) onSuccess();
      navigate("/dashboard", { replace: true });

    } catch (err) {
      toast.error(err.message || "Verification failed. Invalid or expired code.");
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
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          {step === 1 ? "Create account" : "Verify your email"}
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          {step === 1 ? (
            <>
              Already have an account?{" "}
              <button type="button" onClick={switchToLogin} className="text-indigo-600 font-semibold hover:underline cursor-pointer">
                Login
              </button>
            </>
          ) : (
            `We sent a 6-digit code to ${formData.email || "your email"}`
          )}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        
        {/* ==================== STEP 1: USER DETAILS FORM ==================== */}
        {step === 1 && (
          <>
          <form onSubmit={handleSubmit(onRequestOtp)} className="space-y-4">
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
              placeholder="Select your organisation"
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
              Send Verification Code
            </Button>
          </form>
          <GoogleAuthButton 
            actionText="Continue with Google" 
            onGoogleSuccess={handleGoogleSuccess} 
          />
          </>
        )}

        {/* ==================== STEP 2: OTP VERIFICATION FORM ==================== */}
        {step === 2 && (
          <form onSubmit={onVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verification Code
              </label>
              <input
                type="text"
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} // Only allow numbers
                placeholder="000000"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              />
            </div>

            <Button type="submit" loading={loading} disabled={otp.length !== 6} className="w-full">
              Verify & Create Account
            </Button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft size={14} className="mr-1" />
                Back to edit details
              </button>
            </div>
          </form>
        )}

        {step === 1 && (
          <p className="text-[11px] text-gray-400 text-center italic mt-4">
            Note: You will be able to access workspace features once a platform administrator approves your role.
          </p>
        )}
      </div>
    </div>
  );
}