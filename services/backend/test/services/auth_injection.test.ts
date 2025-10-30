import AuthService from '../../src/services/authService';

// mock db
import db from '../../src/db';
jest.mock('../../src/db')
const mockedDb = db as jest.MockedFunction<typeof db>

// mock the nodemailer module
import nodemailer from 'nodemailer';
jest.mock('nodemailer');
const mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

// mock send email function
const sendMailMock = jest.fn().mockResolvedValue({ success: true })
mockedNodemailer.createTransport = jest.fn().mockReturnValue({
    // sendMail: jest.fn().mockResolvedValue({ success: true }),
    sendMail: sendMailMock,
});

describe('Inyection', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });

    it('Try inyection on create account', async () => {

        const username = "<%= 2 + 2 %>"
        const newUser = {
            username: username,
            password: 'newpassword123',
            email: 'a@a.com2',
            first_name: 'First',
            last_name: 'Last'
        };

        // Mock the database get user
        const getUserChain = {
            where: jest.fn().mockReturnThis(),
            orWhere: jest.fn().mockReturnThis(),
            first: jest.fn().mockResolvedValue(undefined),
        };
        // Mock the database insert
        const createUserChain = {
            insert: jest.fn().mockResolvedValue(1),
        };
        mockedDb
            .mockReturnValueOnce(getUserChain as any)
            .mockReturnValueOnce(createUserChain as any);

        await AuthService.createUser(newUser as any);

        expect(mockedNodemailer.createTransport).toHaveBeenCalled();

        // obtenemos el parámetro que se le pasó a la función
        const email = (sendMailMock as any).mock.calls[0][0].html

        // si el html contiene el string textual, la inyección no funcionó
        expect(email).toContain(username)
    });
});
