// import {
//   BadRequestException,
//   Injectable,
//   InternalServerErrorException,
//   UseInterceptors,
// } from "@nestjs/common";
// import {
//   BNVDto,
//   ForgotPasswordDto,
//   ForgotPasswordPhoneVerifyDto,
//   LoginDto,
//   GettingStartedDto,
//   ResetPasswordDto,
//   CreatePasswordDto,
//   CreateTransactionPinDto,
//   IdentityVerificationDto,
//   GetAllUserDto,
// } from "./dto/auth.dto";
// import { PrismaService } from "src/prisma/prisma.service";
// import { JwtService } from "@nestjs/jwt";
// import { ConfigService } from "@nestjs/config";
// import { v4 as uuidv4 } from "uuid";
// import * as crypto from "crypto";
// import { PasswordService } from "./password.service";
// import { MailService } from "../mail/mail.service";
// import { ResponseInterceptor } from "../responeFilter/respone.service";
// import { User, UserGender, UserRole } from "../../prisma/generated/client";
// import { AuthResolver } from "./authFinder.service";
// import { ServiceFetcherService } from "src/service-fetcher/service-fetcher.service";
// import { TokenService } from "src/service-fetcher/token.service";

// @UseInterceptors(ResponseInterceptor)
// @Injectable()
// export class AuthService {
//   constructor(
//     private prisma: PrismaService,
//     private readonly jwtService: JwtService,
//     private readonly configService: ConfigService,
//     private readonly passwordService: PasswordService,
//     private readonly mailService: MailService,
//     private readonly authResolver: AuthResolver,
//     private readonly serviceFetcher: ServiceFetcherService,
//     private readonly tokenService: TokenService,
//   ) {}

//   async gettingStarted(dto: GettingStartedDto) {
//     const { first_name, last_name, email, phone_number, role } = dto;

//     const foundUser = await this.authResolver.findOneByPhone(phone_number);

//     if (foundUser) {
//       throw new BadRequestException("Phone number is already taken");
//     }

//     const foundEmail = foundUser?.email === email;

//     if (foundEmail) {
//       throw new BadRequestException("Email is already taken by another user");
//     }

//     const code = crypto.randomInt(100000, 999999);

//     const hashedVerificationCode = await this.passwordService.hashPassword(
//       code.toString(),
//     );

//     const newUser = await this.prisma.user.create({
//       data: {
//         id: uuidv4(),
//         email,
//         first_name,
//         last_name,
//         phone_number,
//         role: role as unknown as UserRole,
//         verification_code: hashedVerificationCode,
//       },
//     });

//     if (newUser) {
//       await this.mailService.userSignUp({
//         to: email,
//         data: {
//           name: first_name,
//           code: code.toString(),
//         },
//       });

//       return {
//         message: `Account with ${email} successfully created. Check email for verification code`,
//         data: {
//           code: code,
//         },
//       };
//     }
//   }

//   async confirmPhoneNumberCode(dto: ForgotPasswordPhoneVerifyDto) {
//     const { code, phone_number } = dto;
//     console.log(code, phone_number);

//     const foundUser = await this.authResolver.findOneByPhone(phone_number);

//     if (!foundUser) {
//       throw new BadRequestException("Invalid phone number");
//     }

//     if (foundUser.phone_verified) {
//       throw new BadRequestException("Phone number already verified");
//     }

//     const isMatch = await this.passwordService.validatePassword(
//       code,
//       foundUser.verification_code,
//     );

//     if (!isMatch) {
//       throw new BadRequestException("Verification code is incorrect");
//     }

//     const updatedUser = await this.prisma.user.update({
//       where: { phone_number: phone_number },
//       data: { phone_verified: true },
//     });

//     if (!updatedUser) {
//       throw new BadRequestException("Failed to update user");
//     }

//     if (updatedUser) {
//       return {
//         message: "Phone number verified successfully",
//       };
//     }
//   }

//   async bvnVerification(dto: BNVDto) {
//     const { bvn_number } = dto;

//     if (!bvn_number) {
//       return {
//         message: "Wrong credentials",
//         bvn_details: {},
//       };
//     }

//     const bvn_details = {};
//     return {
//       message: "BVN verified successfully",
//       data: bvn_details,
//     };
//   }

//   async createPassword(dto: CreatePasswordDto) {
//     const { phone_number, password } = dto;

//     try {
//       const foundUser = await this.authResolver.findOneByPhone(phone_number);

//       if (!foundUser) {
//         throw new BadRequestException("Invalid phone number");
//       }

//       const hashedPassword = await this.passwordService.hashPassword(password);

//       const updatedUser = await this.prisma.user.update({
//         where: { phone_number: phone_number },
//         data: {
//           password: hashedPassword,
//         },
//       });

//       if (!updatedUser) {
//         throw new BadRequestException("Something went wrong");
//       }

//       if (updatedUser) {
//         return {
//           message: "Password created successfully",
//         };
//       }
//     } catch (error) {
//       throw new InternalServerErrorException("Internal server error");
//     }
//   }

//   async createTransactionPin(dto: CreateTransactionPinDto) {
//     const { phone_number, user_pin } = dto;

//     try {
//       const foundUser = await this.authResolver.findOneByPhone(phone_number);

//       if (!foundUser) {
//         throw new BadRequestException("Invalid phone number");
//       }

//       const hashedPin = await this.passwordService.hashPassword(user_pin);

//       const updatedUser = await this.prisma.user.update({
//         where: { phone_number: phone_number },
//         data: {
//           user_pin: hashedPin as unknown as string,
//         },
//       });

//       if (!updatedUser) {
//         throw new BadRequestException("Something went wrong");
//       }

//       if (updatedUser) {
//         return {
//           message: "Pin created successfully",
//         };
//       }
//     } catch (error) {
//       throw new InternalServerErrorException("Internal server error");
//     }
//   }

//   async identityVerification(dto: IdentityVerificationDto) {
//     const {
//       user_name,
//       driver_license,
//       uploaded_license_img,
//       nin_number,
//       bvn,
//       uploaded_nin_card,
//       passport_number,
//       uploaded_passport_img,
//       gender,
//       DOB,
//       phone_number,
//     } = dto;

//     const token = this.tokenService.getAccessToken();

//     const foundUser = await this.authResolver.findOneByPhone(phone_number);

//     if (!foundUser) {
//       throw new BadRequestException("Invalid phone number");
//     }

//     const virtualAccount = await this.serviceFetcher.creatVirtualNUBANS({
//       token,
//       customer_name: `${foundUser.first_name} ${foundUser.last_name}`,
//       customer_email: foundUser.email,
//       customer_phone: foundUser.phone_number,
//       customer_id: foundUser.id,
//     });

//     if (virtualAccount?.response_code !== "00") {
//       throw new BadRequestException(virtualAccount?.response_message);
//     }

//     if (
//       virtualAccount?.response_code === "00" &&
//       virtualAccount?.response_message === "Successful Request"
//     ) {
//       const updatedUser = await this.prisma.user.update({
//         where: { phone_number: phone_number },
//         data: {
//           user_name,
//           driver_license: driver_license ?? driver_license,
//           uploaded_license_img: uploaded_license_img ?? uploaded_license_img,
//           nin_number: nin_number ?? nin_number,
//           bvn: bvn ?? bvn,
//           uploaded_nin_card: uploaded_nin_card ?? uploaded_nin_card,
//           passport_number: passport_number ?? passport_number,
//           uploaded_passport_img: uploaded_passport_img ?? uploaded_passport_img,
//           gender: gender as unknown as UserGender,
//           DOB,
//           account_status: "verified",
//           status: "active",
//           is_active: true,
//           wallet: {
//             create: {
//               wallet_balance: 0,
//               wallet_acc_nos: virtualAccount.response_data.virtual_acct_no,
//               wallet_name: virtualAccount.response_data.virtual_acct_name,
//               id: uuidv4(),
//               wallet_owner_names: `${foundUser.first_name} ${foundUser.last_name}`,
//             },
//           },
//         },
//       });

//       if (!updatedUser) {
//         throw new BadRequestException("Something went wrong");
//       }

//       if (updatedUser) {
//         return {
//           message: "Identity verification submitted successfully",
//         };
//       }
//     }
//   }

//   async login(dto: LoginDto) {
//     const { email, password } = dto;

//     const foundUser = await this.authResolver.findOneByEmail(email);

//     if (!foundUser) {
//       throw new BadRequestException("Wrong email credential");
//     }

//     const isMatch = this.passwordService.validatePassword(
//       password,
//       foundUser.password,
//     );

//     if (!isMatch) {
//       throw new BadRequestException("Wrong password inputed");
//     }

//     const payload = {} as User;
//     const allToken = this.passwordService.generateTokens(payload);

//     return {
//       message: "You have login successfully",
//       data: {
//         ...allToken,
//       },
//     };
//   }

//   async forgotPassword(dto: ForgotPasswordDto) {
//     const { phone_number } = dto;
//     try {
//       const codeGenerated = crypto.randomInt(100000, 999999);

//       const hashedCode = await this.passwordService.hashPassword(
//         codeGenerated.toString(),
//       );
//       const foundUser = await this.prisma.user.update({
//         where: { phone_number },
//         data: {
//           password_resetCode: hashedCode,
//         },
//       });

//       if (!foundUser) {
//         throw new BadRequestException("Invalid phone_number");
//       }

//       await this.mailService.forgotPassword({
//         to: foundUser.email,
//         data: {
//           name: foundUser.first_name,
//           code: codeGenerated.toString(),
//         },
//       });

//       return {
//         message: "Verication code sent",
//         data: {
//           code: codeGenerated,
//         },
//       };
//     } catch (err) {
//       throw new InternalServerErrorException("Internal server error");
//     }
//   }

//   async verifyForgotPasswordPhoneNumber(dto: ForgotPasswordPhoneVerifyDto) {
//     const { code, phone_number } = dto;

//     try {
//       const foundUser = await this.authResolver.findOneByPhone(phone_number);

//       if (!foundUser) {
//         throw new BadRequestException("Invalid phone number");
//       }

//       const isMatch = await this.passwordService.validatePassword(
//         code,
//         foundUser.password_resetCode,
//       );

//       if (!isMatch) {
//         throw new BadRequestException("Verification code is incorrect");
//       }

//       return {
//         meassage: "Phone number verified",
//       };
//     } catch (error) {
//       throw new InternalServerErrorException("Internal server error");
//     }
//   }

//   async resetPassword(dto: ResetPasswordDto) {
//     const { code, new_password, phone_number } = dto;

//     const foundUser = await this.authResolver.findOneByPhone(phone_number);
//     if (!foundUser) {
//       throw new BadRequestException("Invalid code");
//     }

//     if (foundUser) {
//       const isMatch = await this.passwordService.validatePassword(
//         code,
//         foundUser.password_resetCode,
//       );

//       if (!isMatch) {
//         throw new BadRequestException("Verification code is incorrect");
//       }

//       const hashedPassword =
//         await this.passwordService.hashPassword(new_password);

//       await this.prisma.user.update({
//         where: { id: foundUser.id },
//         data: {
//           password: hashedPassword,
//           password_resetCode: null,
//         },
//       });

//       return {
//         message: "Your password has been successfully reset",
//       };
//     }
//   }

//   async activateUser(id: string) {
//     const user_time_created = new Date();

//     const activatedUser = await this.prisma.user.update({
//       where: { id },
//       data: {
//         is_active: true,
//         updated_at: user_time_created,
//       },
//     });

//     if (!activatedUser) {
//       throw new BadRequestException("Failed to  activate  user");
//     }

//     return {
//       message: "User activated successfully",
//       data: {
//         ...activatedUser,
//       },
//     };
//   }

//   async deactivateUser(id: string) {
//     const user_time_created = new Date();

//     const deactivatedUser = await this.prisma.user.update({
//       where: { id },
//       data: {
//         is_active: false,
//         updated_at: user_time_created,
//       },
//     });

//     if (!deactivatedUser) {
//       throw new BadRequestException("Cannot deactivate user");
//     }

//     if (deactivatedUser) {
//       await this.mailService.deactiveVariousUsers({
//         to: deactivatedUser.email,
//         data: {
//           name: deactivatedUser.first_name,
//         },
//       });

//       return {
//         message: "User deactivated successfully",
//         data: {
//           ...deactivatedUser,
//         },
//       };
//     }
//   }

//   async getUserById(id: string) {
//     const user = await this.prisma.user.findUnique({
//       where: { id },
//       select: {
//         id: true,
//         created_at: true,
//         first_name: true,
//         last_login: true,
//         last_name: true,
//         phone_number: true,
//         status: true,
//         email: true,
//         updated_at: true,
//         is_active: true,
//         gender: true,
//         address: true,
//         account_status: true,
//         wallet: {
//           select: {
//             wallet_balance: true,
//             wallet_acc_nos: true,
//           },
//         },
//       },
//     });

//     if (!user) {
//       throw new BadRequestException("User not found");
//     }

//     return {
//       message: "User fetched successfully",
//       data: {
//         ...user,
//       },
//     };
//   }

//   async getAllUsers(dto: GetAllUserDto) {
//     const {
//       created_at,
//       page = 1,
//       limit = 10,
//       id,
//       search,
//       status,
//       phone_number,
//       gender,
//       account_status,
//     } = dto;

//     try {
//       const limitNumber = Number(limit);
//       const skip = ((page as number) - 1) * limitNumber;
//       const offset = limitNumber;

//       const where: { [key: string]: any } = {};

//       if (id) {
//         where.id = { contains: id, mode: "insensitive" };
//       }

//       if (status) {
//         where.status = status;
//       }

//       if (created_at) {
//         where.created_at = {
//           gte: new Date(created_at).toISOString(),
//         };
//       }

//       if (phone_number) {
//         where.phone_number = {
//           contains: phone_number,
//         };
//       }

//       if (gender) {
//         where.gender = gender;
//       }
//       if (account_status) {
//         where.account_status = account_status;
//       }

//       // Exclude users with the "admin" role
//       where.role = {
//         not: {
//           not: "admin",
//         },
//       };

//       if (search) {
//         where.OR = [
//           {
//             first_name: search.toString(),
//           },
//           {
//             last_name: search.toString(),
//           },
//           {
//             phone_number: search.toString(),
//           },
//           {
//             account_status: search.toString(),
//           },
//           { id: { contains: search.toString(), mode: "insensitive" } },
//           // Add more fields as needed
//         ];
//       }

//       const [allUsers, totalCount] = await Promise.all([
//         this.prisma.user.findMany({
//           where,
//           select: {
//             id: true,
//             created_at: true,
//             first_name: true,
//             last_login: true,
//             last_name: true,
//             phone_number: true,
//             status: true,
//             email: true,
//             updated_at: true,
//             is_active: true,
//             gender: true,
//             address: true,
//             account_status: true,
//             wallet: {
//               select: {
//                 wallet_balance: true,
//                 wallet_acc_nos: true,
//               },
//             },
//           },
//           orderBy: { created_at: "desc" },
//           skip,
//           take: offset as number,
//         }),
//         this.prisma.user.count({
//           where,
//         }),
//       ]);

//       const totalPages = Math.ceil(totalCount / limitNumber);

//       const message = allUsers.length
//         ? "Users fetched successfully"
//         : "No Users Found";
//       const success = allUsers?.length ? true : false;

//       return {
//         message,
//         data: {
//           total: success ? totalCount : 0,
//           total_pages: success ? totalPages : 0,
//           current_page: success ? Number(page) : 0,
//           page_size: success ? offset : 0,
//           users_list: allUsers,
//         },
//       };
//     } catch (error) {
//       console.error("Error in get all users:", error);
//       throw error;
//     }
//   }
// }
