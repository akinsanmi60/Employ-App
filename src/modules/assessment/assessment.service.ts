import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { v4 as uuidv4 } from "uuid";
import { CalculateDto, CreateAssessmentDto } from "./dto/assessment.dto";
import { GetAllAssessmentDto } from "./dto/assessment-response.dto";

@Injectable()
export class AssessmentService {
  private readonly timeGenerated: string;

  constructor(private readonly prisma: PrismaService) {
    this.timeGenerated = new Date().toISOString();
  }

  async createAssessment(id: string, dto: CreateAssessmentDto) {
    const { setNo, assessmentType, setQuestions } = dto;
    console.log(setQuestions);
    console.log(JSON.parse(setQuestions as unknown as string));

    const assessmentCreator = await this.prisma.empyloUser.findUnique({
      where: {
        id: id,
      },
    });

    if (!assessmentCreator) {
      throw new BadRequestException("User not found");
    }

    let assessmentData = {};

    if (assessmentType === "weekly") {
      assessmentData = {
        id: uuidv4(),
        created_at: this.timeGenerated,
        setNo: setNo,
        assessmentType: assessmentType,
        empyloUser: {
          connect: {
            id: assessmentCreator.id,
          },
        },
        setQuestions: setQuestions,
      };
    } else {
      assessmentData = {
        id: uuidv4(),
        created_at: this.timeGenerated,
        setNo: setNo,
        assessmentType: assessmentType,
        empyloUserCheckin: {
          connect: {
            id: assessmentCreator.id,
          },
        },
        setQuestions: setQuestions,
      };
    }

    const assessment = await this.prisma.assessment.create({
      data: assessmentData,
    });

    if (!assessment) {
      throw new BadRequestException("Failed to create assessment");
    }

    return {
      message: "Assessment created successfully",
    };
  }

  async getLatestWeeklyAssessment() {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        assessmentType: "weekly",
      },
      orderBy: {
        created_at: "desc",
      },
    });

    if (!assessment) {
      return {
        message: "No weekly assessment found",
        data: null,
      };
    }

    const timeDifferenceInHours = await this.checkAsessmentValidity(assessment);

    if (timeDifferenceInHours >= 144) {
      // If the assessment is older than 144 hours, return null
      return {
        message: "Weekly assessment found but older than 24 hours",
        data: null,
      };
    }

    const showAssessment = {
      id: assessment.id,
      created_at: assessment.created_at,
      setNo: assessment.setNo,
      assessmentType: assessment.assessmentType,
      setQuestions: assessment.setQuestions,
    };

    return {
      message: "Weekly assessment found",
      data: showAssessment,
    };
  }

  async getLatestDailyCheckinAssessment() {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        assessmentType: "dailyCheckin",
      },
      orderBy: {
        created_at: "desc",
      },
    });

    if (!assessment) {
      return {
        message: "No daily checkin assessment found",
        data: null,
      };
    }

    const timeDifferenceInHours = await this.checkAsessmentValidity(assessment);

    if (timeDifferenceInHours > 24) {
      // If the assessment is older than 24 hours, return null
      return {
        message: "Daily checkin assessment found but older than 24 hours",
        data: null,
      };
    }

    const showAssessment = {
      id: assessment.id,
      created_at: assessment.created_at,
      setNo: assessment.setNo,
      assessmentType: assessment.assessmentType,
      setQuestions: assessment.setQuestions,
    };

    return {
      message: "Daily checkin assessment found",
      data: showAssessment,
    };
  }

  async getAssessmentById(id: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: {
        id: id,
      },
      select: {
        empyloUser: {
          select: {
            id: true,
            firstName: true,
            empyloID: true,
            lastName: true,
            passportImg: true,
          },
        },
        empyloUserCheckin: {
          select: {
            id: true,
            firstName: true,
            empyloID: true,
            lastName: true,
            passportImg: true,
          },
        },
        assessmentType: true,
        created_at: true,
        setNo: true,
        setQuestions: true,
        id: true,
      },
    });

    if (!assessment) {
      throw new BadRequestException("Assessment not found");
    }

    let showAssessment = {};
    if (assessment.assessmentType === "dailyCheckin") {
      showAssessment = {
        id: assessment.id,
        created_at: assessment.created_at,
        setNo: assessment.setNo,
        assessmentType: assessment.assessmentType,
        setQuestions: assessment.setQuestions,
        empyloUser: assessment.empyloUserCheckin,
      };
    } else {
      showAssessment = {
        id: assessment.id,
        created_at: assessment.created_at,
        setNo: assessment.setNo,
        assessmentType: assessment.assessmentType,
        setQuestions: assessment.setQuestions,
        empyloUser: assessment.empyloUser,
      };
    }

    return {
      message: "Assessment found",
      data: showAssessment,
    };
  }

  async deleteAssessmentById(id: string) {
    const assessment = await this.prisma.assessment.delete({
      where: {
        id: id,
      },
    });

    if (!assessment) {
      throw new BadRequestException("Assessment not found");
    }

    return {
      message: "Assessment deleted successfully",
    };
  }

  async getAllAssessment(dto: GetAllAssessmentDto) {
    const { created_at, page = 1, limit = 10, id } = dto;
    const limitNumber = Number(limit);
    const skip = ((page as number) - 1) * limitNumber;
    const offset = limitNumber;

    const where: { [key: string]: any } = {};

    if (id) {
      where.id = { contains: id, mode: "insensitive" };
    }

    if (created_at) {
      where.created_at = {
        gte: new Date(created_at).toISOString(),
      };
    }

    const [allAssessments, totalCount] = await Promise.all([
      this.prisma.assessment.findMany({
        where,
        select: {
          id: true,
          created_at: true,
          setNo: true,
          assessmentType: true,
          setQuestions: true,
          empyloUser: {
            select: {
              id: true,
              firstName: true,
              empyloID: true,
              lastName: true,
              passportImg: true,
            },
          },
          empyloUserCheckin: {
            select: {
              id: true,
              firstName: true,
              empyloID: true,
              lastName: true,
              passportImg: true,
            },
          },
        },
        skip: skip,
        take: offset,
        orderBy: {
          created_at: "desc",
        },
      }),
      this.prisma.assessment.count({
        where: where,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNumber);

    const message = allAssessments.length
      ? "Assessments fetched successfully"
      : "No Assessments Found";
    const success = allAssessments?.length ? true : false;

    return {
      message,
      data: {
        total: success ? totalCount : 0,
        total_pages: success ? totalPages : 0,
        current_page: success ? Number(page) : 0,
        page_size: success ? offset : 0,
        assessments: success ? allAssessments : [],
      },
    };
  }

  async weeklyAssessmentCalculate(
    userId: string,
    assessmentId: string,
    dto: CalculateDto,
  ) {
    const { scoreOnAttempt, setNo, assessmentType, circleId, circleType } = dto;

    const cirlcleObjToInsert = await this.checkCircle(circleId, circleType);

    const [assessmentCheck, foundUser] = await Promise.all([
      this.prisma.assessment.findUnique({
        where: {
          id: assessmentId,
        },
      }),

      this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      }),
    ]);

    if (!foundUser) {
      throw new BadRequestException("User not found");
    }

    if (!assessmentCheck) {
      throw new BadRequestException("Assessment not found");
    }

    if (assessmentCheck.setNo !== setNo) {
      throw new BadRequestException("Set number does not match");
    }

    if (assessmentCheck.assessmentType !== assessmentType) {
      throw new BadRequestException("Assessment type does not match");
    }

    const weeklyScore = scoreOnAttempt ? Number(scoreOnAttempt) * 2.2 : 0;

    const scoreInserted = await this.prisma.scoreDetail.create({
      data: {
        id: uuidv4(),
        weeklyScore: weeklyScore,
        owner: {
          connect: {
            id: foundUser?.id,
          },
        },
        assessmentType: assessmentType,
        setNo: setNo,
        ...cirlcleObjToInsert,
      },
    });

    if (!scoreInserted) {
      throw new BadRequestException("Weekly score was not created");
    }

    return {
      message: "Weekly score created successfully",
      data: {
        weeklyScore: weeklyScore,
      },
    };
  }

  async dailyCheckinkAssessmentCalculate(
    userId: string,
    assessmentId: string,
    dto: CalculateDto,
  ) {
    const { scoreOnAttempt, setNo, assessmentType, circleId, circleType } = dto;

    const currentDate = new Date();

    const startOfCurrentWeek = new Date(
      currentDate.setDate(currentDate.getDate() - currentDate.getDay()),
    ).toISOString(); // Move back to Sunday

    const endOfCurrentWeek = new Date(
      currentDate.setDate(currentDate.getDate() + 6),
    ).toISOString(); // Add 6 days to get Saturday

    let cirlcleObj = {};
    if (circleType === "company") {
      const circle = this.prisma.companyCircles.findUnique({
        where: {
          id: circleId,
        },
      });

      if (!circle) {
        throw new BadRequestException("Circle not found");
      }

      cirlcleObj = {
        coyCirleWith: {
          connect: {
            id: circleId,
          },
        },
      };
    } else if (circleType === "personal") {
      const circle = this.prisma.userCircles.findUnique({
        where: {
          id: circleId,
        },
      });

      if (!circle) {
        throw new BadRequestException("Circle not found");
      }

      cirlcleObj = {
        userCirleWith: {
          connect: {
            id: circleId,
          },
        },
      };
    }

    const [assessmentCheck, scoreInserted, foundUser] = await Promise.all([
      this.prisma.assessment.findUnique({
        where: {
          id: assessmentId,
        },
      }),
      this.prisma.scoreDetail.findFirst({
        where: {
          ownerID: userId,
          created_at: {
            gte: startOfCurrentWeek,
            lt: endOfCurrentWeek,
          },
        },
        orderBy: {
          created_at: "desc",
        },
      }),
      this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      }),
    ]);

    if (!scoreInserted) {
      throw new BadRequestException("Please take your weekly assessment first");
    }

    if (!assessmentCheck) {
      throw new BadRequestException("Assessment not found");
    }

    if (assessmentCheck.setNo !== setNo) {
      throw new BadRequestException("Set number does not match");
    }

    if (assessmentCheck.assessmentType !== assessmentType) {
      throw new BadRequestException("Assessment type does not match");
    }

    const dailyScore = await this.prisma.scoreDetail.create({
      data: {
        id: uuidv4(),
        dailyScore: scoreOnAttempt ? Number(scoreOnAttempt) : 0,
        owner: {
          connect: {
            id: foundUser.id,
          },
        },
        assessmentType: assessmentType,
        setNo: setNo,
        created_at: new Date(),
        assessmentWith: {
          connect: {
            id: assessmentId,
          },
        },
        ...cirlcleObj,
      },
    });

    if (!dailyScore) {
      throw new BadRequestException("Something went wrong");
    }

    return {
      message: "Daily checkin assessment is successfully submitted",
    };
  }

  private async checkAsessmentValidity(assessment) {
    // Calculate the time difference between now and the assessment's created_at timestamp
    const currentTime = new Date();
    const assessmentTime = new Date(assessment.created_at);
    const timeDifference = currentTime.getTime() - assessmentTime.getTime();
    const timeDifferenceInHours = timeDifference / (1000 * 60 * 60);

    return timeDifferenceInHours;
  }

  private async checkCircle(circleType: string, circleId: string) {
    let cirlcleObj = {};
    if (circleType === "company") {
      const circle = await this.prisma.companyCircles.findUnique({
        where: {
          id: circleId,
        },
      });

      if (!circle) {
        throw new BadRequestException("Circle not found");
      }

      cirlcleObj = {
        coyCirleWith: {
          connect: {
            id: circle?.id,
          },
        },
      };
    } else if (circleType === "personal") {
      const circle = await this.prisma.userCircles.findUnique({
        where: {
          id: circleId,
        },
      });

      if (!circle) {
        throw new BadRequestException("Circle not found");
      }

      cirlcleObj = {
        userCirleWith: {
          connect: {
            id: circle?.id,
          },
        },
      };
    }

    return cirlcleObj;
  }
}
