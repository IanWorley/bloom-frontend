import {
  BaseQueryFn,
  createApi,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { auth } from '../config/firebase';
import { PARTNER_ACCESS_CODE_STATUS } from '../constants/enums';
import { delay } from '../utils/delay';
import { Course, Courses } from './coursesSlice';
import { PartnerAccess, PartnerAccesses } from './partnerAccessSlice';
import { PartnerAdmin } from './partnerAdminSlice';
import { Partner, PartnerFeature } from './partnersSlice';
import { RootState } from './store';
import { Subscription, Subscriptions, User } from './userSlice';

export interface GetUserResponse {
  user: User;
  partnerAccesses: PartnerAccesses;
  partnerAdmin: PartnerAdmin;
  courses: Courses;
  subscriptions: Subscriptions;
}
export interface SessionActionPayload {
  storyblokId: number;
}

interface WhatsappUnsubscribePayload {
  cancelledAt: Date;
  id: string;
}

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  prepareHeaders: (headers, { getState }) => {
    const user = (getState() as RootState).user;
    const token = user.token;

    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await baseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    // force reset token
    const token = await auth.currentUser?.getIdToken(true);

    if (token) {
      // allow time for new token to update in state
      await delay(200);
      // retry the initial query
      result = await baseQuery(args, api, extraOptions);
    }
  }
  return result;
};

export const api = createApi({
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getUser: builder.mutation<GetUserResponse, string>({
      query(body) {
        return {
          url: 'user/me',
          method: 'POST',
          body,
        };
      },
    }),
    getUsers: builder.query({
      query(params: { searchCriteria: string }) {
        return {
          url: 'user',
          method: 'GET',
          params,
        };
      },
    }),
    addUser: builder.mutation<
      GetUserResponse,
      Partial<User> & { partnerId?: string; password: string }
    >({
      query(body) {
        return {
          url: 'user',
          method: 'POST',
          body,
        };
      },
    }),
    deleteUser: builder.mutation<string, Partial<User>>({
      query() {
        return {
          url: `user`,
          method: 'DELETE',
        };
      },
    }),
    getPartnerByName: builder.query<Partner, string>({
      query: (name) => ({ url: `partner/${name}` }),
    }),
    getPartners: builder.query<Partner[], undefined>({
      query: () => ({ url: `partner` }),
    }),
    getAutomaticAccessCodeFeatureForPartner: builder.query<PartnerFeature, string>({
      query: (name) => ({ url: `/partner-feature/automatic-access-code/${name}` }),
    }),
    validateCode: builder.mutation<
      | { status: PARTNER_ACCESS_CODE_STATUS }
      | { error: { data: { statusCode: number; message: string } } },
      { partnerAccessCode: string }
    >({
      query(body) {
        return {
          url: `partner-access/validate-code`,
          method: 'POST',
          body,
        };
      },
    }),
    assignPartnerAccess: builder.mutation<PartnerAccess, { partnerAccessCode: string }>({
      query(body) {
        return {
          url: 'partner-access/assign',
          method: 'POST',
          body,
        };
      },
    }),
    addPartnerAccess: builder.mutation<PartnerAccess, Partial<PartnerAccess>>({
      query(body) {
        return {
          url: 'partner-access',
          method: 'POST',
          body,
        };
      },
    }),
    startSession: builder.mutation<Course, SessionActionPayload>({
      query(body) {
        return {
          url: 'session-user',
          method: 'POST',
          body,
        };
      },
    }),
    completeSession: builder.mutation<Course, SessionActionPayload>({
      query(body) {
        return {
          url: 'session-user/complete',
          method: 'POST',
          body,
        };
      },
    }),
    addPartnerAdmin: builder.mutation<
      PartnerAdmin,
      { partnerId: string; name: string; email: string }
    >({
      query(body) {
        return {
          url: 'partner-admin/create-user',
          method: 'POST',
          body,
        };
      },
    }),
    subscribeToWhatsapp: builder.mutation<Subscription, { subscriptionInfo: string }>({
      query(body) {
        return {
          url: 'subscription-user/whatsapp',
          method: 'POST',
          body,
        };
      },
    }),
    unsubscribeFromWhatsapp: builder.mutation<Subscription, WhatsappUnsubscribePayload>({
      query: ({ id, cancelledAt }) => ({
        url: `subscription-user/whatsapp/${id}`,
        method: 'PATCH',
        body: { cancelledAt },
      }),
    }),
    updatePartnerAccess: builder.mutation<string, { id: string; therapySessionsRemaining: number }>(
      {
        query: ({ id, therapySessionsRemaining }) => ({
          url: `partner-access/${id}`,
          method: 'PATCH',
          body: { therapySessionsRemaining },
        }),
      },
    ),
  }),
});

export const {
  useGetUserMutation,
  useAddUserMutation,
  useAssignPartnerAccessMutation,
  useAddPartnerAccessMutation,
  useStartSessionMutation,
  useCompleteSessionMutation,
  useValidateCodeMutation,
  useGetPartnersQuery,
  useGetPartnerByNameQuery,
  useAddPartnerAdminMutation,
  useGetAutomaticAccessCodeFeatureForPartnerQuery,
  useSubscribeToWhatsappMutation,
  useUnsubscribeFromWhatsappMutation,
  useUpdatePartnerAccessMutation,
} = api;
