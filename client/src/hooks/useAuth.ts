import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, login, logout, register } from "../api/auth";
import type { Me } from "../api/types";

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: getMe });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => login(email, password),
    onSuccess: (user) => {
      queryClient.setQueryData<Me>(["me"], { user });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      email,
      password,
      display_name,
    }: {
      email: string;
      password: string;
      display_name: string;
    }) => register(email, password, display_name),
    onSuccess: (user) => {
      queryClient.setQueryData<Me>(["me"], { user });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData<Me>(["me"], { user: null });
    },
  });
}
