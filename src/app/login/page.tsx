"use client";

import Link from "next/link";
import NextImage from "next/image";


import { useActionState, useState } from "react";
import { LabeledInput } from "@/components/inputs/LabeledInput";
import { InputContainer } from "@/components/inputs/InputContainer";
import { login } from "@/actions/auth";

const initialState = {
    success: false,
    error: ''
};

export default function Login() {
    const [state, formAction, isPending] = useActionState(login, initialState);

    const [showPassword, setShowPassword] = useState(false);
    const [cedulaPrefix, setCedulaPrefix] = useState("V");
    const [isPrefixOpen, setIsPrefixOpen] = useState(false);
    const prefixes = ["V", "E"];
    const [cedulaNumber, setCedulaNumber] = useState("");
    // Password state managed by form natively now

    // Construir la cédula completa para el input hidden
    const fullCedula = `${cedulaPrefix}-${cedulaNumber}`;

    return (
        <div className="w-full h-screen relative overflow-hidden">
            <NextImage
                src="/bg.svg"
                alt="Background"
                fill
                className="object-cover"
                priority
            />
            <div className="w-full h-full left-0 top-0 absolute" style={{ background: "linear-gradient(111deg, #036 42.22%, rgba(0, 102, 204, 0.64) 102.14%)" }} />

            <Link href="/" className="absolute top-8 left-8 transition-all duration-300 z-50 group">
                <span className="icon-[mingcute--arrow-left-line] text-6xl text-white group-hover:-translate-x-1 transition-transform"></span>
            </Link>

            <div className="w-full h-full px-[19%] py-[3%] left-0 top-0 absolute inline-flex flex-col justify-center items-center gap-6 overflow-hidden">
                <NextImage
                    src="/logo.svg"
                    alt="Logo"
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-[47%] h-auto"
                    priority
                />
                <div className="self-stretch px-[3%] py-[2%] bg-neutral-50 rounded-[20px] shadow-[0px_5px_24.600000381469727px_0px_rgba(0,0,0,0.25)] flex flex-col justify-start items-center gap-5">

                    <form data-testid="login-form" action={formAction} className="self-stretch flex flex-col gap-5">

                        {/* Hidden Input para mandar la cédula completa */}
                        <input data-testid="login-cedula" type="hidden" name="cedula" value={fullCedula} />

                        <LabeledInput label="Cedula de Identidad:" className="self-stretch">
                            <InputContainer className="px-[0.8%] py-[0.3%] flex items-center gap-2">
                                <span className="icon-[tabler--users] text-2xl text-sky-950"></span>
                                <div className="relative">
                                    <div
                                        onClick={() => setIsPrefixOpen(!isPrefixOpen)}
                                        className="flex items-center gap-1 cursor-pointer"
                                    >
                                        <div className="text-sky-950 text-xl font-semibold">{cedulaPrefix}-</div>
                                        <span className={`icon-[mingcute--down-fill] text-xl text-sky-950 transition-transform duration-300 ${isPrefixOpen ? "rotate-180" : ""}`}></span>
                                    </div>
                                    {isPrefixOpen && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-neutral-50 rounded-xl outline outline-[3px] outline-sky-950 z-10 overflow-hidden shadow-lg min-w-[60px]">
                                            {prefixes.map((p) => (
                                                <div
                                                    key={p}
                                                    onClick={() => {
                                                        setCedulaPrefix(p);
                                                        setIsPrefixOpen(false);
                                                    }}
                                                    className="px-2 py-2 hover:bg-blue-100 cursor-pointer text-sky-950 text-xl font-semibold text-center"
                                                >
                                                    {p}-
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    placeholder="12.345.678"
                                    className="w-full bg-transparent outline-none text-sky-950 text-xl font-semibold placeholder:text-sky-950/30"
                                    value={cedulaNumber}
                                    onChange={(e) => setCedulaNumber(e.target.value)}
                                    required
                                />
                            </InputContainer>
                        </LabeledInput>

                        <LabeledInput label="Contraseña:" className="self-stretch">
                            <InputContainer className="px-[0.8%] py-[0.3%] justify-between">
                                <div className="flex justify-start items-center gap-2 w-full">
                                    <span className="icon-[uil--lock] text-2xl text-sky-950"></span>
                                    <input
                                        data-testid="login-password"
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="••••••••••••••••••"
                                        className="w-full bg-transparent outline-none text-sky-950 text-xl font-semibold placeholder:text-sky-950/30"
                                        required
                                    />
                                </div>
                                <button
                                    type="button"
                                    onMouseDown={() => setShowPassword(true)}
                                    onMouseUp={() => setShowPassword(false)}
                                    onMouseLeave={() => setShowPassword(false)}
                                    onTouchStart={() => setShowPassword(true)}
                                    onTouchEnd={() => setShowPassword(false)}
                                    className="focus:outline-none flex items-center justify-center cursor-pointer"
                                >
                                    <span className={`text-2xl text-sky-950 ${showPassword ? "icon-[uil--eye]" : "icon-[uil--eye-slash]"}`}></span>
                                </button>
                            </InputContainer>
                        </LabeledInput>

                        {state.error && (
                            <div data-testid="login-error" className="p-3 bg-red-100 text-red-700 rounded-lg text-center text-sm font-semibold">
                                {state.error}
                            </div>
                        )}

                        <div className="self-stretch pt-[1%] flex flex-col justify-start items-center gap-2">
                            <button
                                data-testid="login-submit"
                                type="submit"
                                disabled={isPending}
                                className={`self-stretch py-[1%] rounded-2xl inline-flex justify-center items-center gap-2.5 transition-colors duration-300 ${!isPending ? "bg-[#0A233C] hover:bg-[#0A233C]/90 cursor-pointer" : "bg-gray-400 cursor-not-allowed"}`}
                            >
                                <div className="justify-start text-neutral-50 text-2xl font-semibold">
                                    {isPending ? 'Ingresando...' : 'Iniciar Sesión'}
                                </div>
                            </button>


                        </div>
                    </form>
                </div>
            </div >
        </div >
    );
}