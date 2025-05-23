//
// stream_protocol.cpp
// ~~~~~~~~~~~~~~~~~~~
//
// Copyright (c) 2003-2025 Christopher M. Kohlhoff (chris at kohlhoff dot com)
//
// Distributed under the Boost Software License, Version 1.0. (See accompanying
// file LICENSE_1_0.txt or copy at http://www.boost.org/LICENSE_1_0.txt)
//

// Disable autolinking for unit tests.
#if !defined(BOOST_ALL_NO_LIB)
#define BOOST_ALL_NO_LIB 1
#endif // !defined(BOOST_ALL_NO_LIB)

// Test that header file is self-contained.
#include "asio/local/stream_protocol.hpp"

#include <cstring>
#include "asio/io_context.hpp"
#include "../unit_test.hpp"

//------------------------------------------------------------------------------

// local_stream_protocol_socket_compile test
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// The following test checks that all public member functions on the class
// local::stream_protocol::socket compile and link correctly. Runtime failures
// are ignored.

namespace local_stream_protocol_socket_compile {

void connect_handler(const asio::error_code&)
{
}

void send_handler(const asio::error_code&, std::size_t)
{
}

void receive_handler(const asio::error_code&, std::size_t)
{
}

void write_some_handler(const asio::error_code&, std::size_t)
{
}

void read_some_handler(const asio::error_code&, std::size_t)
{
}

void test()
{
#if defined(ASIO_HAS_LOCAL_SOCKETS)
  using namespace asio;
  namespace local = asio::local;
  typedef local::stream_protocol sp;

  try
  {
    io_context ioc;
    const io_context::executor_type ioc_ex = ioc.get_executor();
    char mutable_char_buffer[128] = "";
    const char const_char_buffer[128] = "";
    socket_base::message_flags in_flags = 0;
    socket_base::keep_alive socket_option;
    socket_base::bytes_readable io_control_command;
    asio::error_code ec;

    // basic_stream_socket constructors.

    sp::socket socket1(ioc);
    sp::socket socket2(ioc, sp());
    sp::socket socket3(ioc, sp::endpoint(""));
    int native_socket1 = ::socket(AF_UNIX, SOCK_STREAM, 0);
    sp::socket socket4(ioc, sp(), native_socket1);

    sp::socket socket5(ioc_ex);
    sp::socket socket6(ioc_ex, sp());
    sp::socket socket7(ioc_ex, sp::endpoint(""));
    int native_socket2 = ::socket(AF_UNIX, SOCK_STREAM, 0);
    sp::socket socket8(ioc_ex, sp(), native_socket2);

    // I/O object functions.

    sp::socket::executor_type ex = socket1.get_executor();
    (void)ex;

    // basic_socket functions.

    sp::socket::lowest_layer_type& lowest_layer = socket1.lowest_layer();
    (void)lowest_layer;

    socket1.open(sp());
    socket1.open(sp(), ec);

    int native_socket3 = ::socket(AF_UNIX, SOCK_STREAM, 0);
    socket1.assign(sp(), native_socket3);
    int native_socket4 = ::socket(AF_UNIX, SOCK_STREAM, 0);
    socket1.assign(sp(), native_socket4, ec);

    bool is_open = socket1.is_open();
    (void)is_open;

    socket1.close();
    socket1.close(ec);

    sp::socket::native_handle_type native_socket5 = socket1.native_handle();
    (void)native_socket5;

    socket1.cancel();
    socket1.cancel(ec);

    bool at_mark1 = socket1.at_mark();
    (void)at_mark1;
    bool at_mark2 = socket1.at_mark(ec);
    (void)at_mark2;

    std::size_t available1 = socket1.available();
    (void)available1;
    std::size_t available2 = socket1.available(ec);
    (void)available2;

    socket1.bind(sp::endpoint(""));
    socket1.bind(sp::endpoint(""), ec);

    socket1.connect(sp::endpoint(""));
    socket1.connect(sp::endpoint(""), ec);

    socket1.async_connect(sp::endpoint(""), connect_handler);

    socket1.set_option(socket_option);
    socket1.set_option(socket_option, ec);

    socket1.get_option(socket_option);
    socket1.get_option(socket_option, ec);

    socket1.io_control(io_control_command);
    socket1.io_control(io_control_command, ec);

    sp::endpoint endpoint1 = socket1.local_endpoint();
    (void)endpoint1;
    sp::endpoint endpoint2 = socket1.local_endpoint(ec);
    (void)endpoint2;

    sp::endpoint endpoint3 = socket1.remote_endpoint();
    (void)endpoint3;
    sp::endpoint endpoint4 = socket1.remote_endpoint(ec);
    (void)endpoint4;

    socket1.shutdown(socket_base::shutdown_both);
    socket1.shutdown(socket_base::shutdown_both, ec);

    // basic_stream_socket functions.

    socket1.send(buffer(mutable_char_buffer));
    socket1.send(buffer(const_char_buffer));
    socket1.send(null_buffers());
    socket1.send(buffer(mutable_char_buffer), in_flags);
    socket1.send(buffer(const_char_buffer), in_flags);
    socket1.send(null_buffers(), in_flags);
    socket1.send(buffer(mutable_char_buffer), in_flags, ec);
    socket1.send(buffer(const_char_buffer), in_flags, ec);
    socket1.send(null_buffers(), in_flags, ec);

    socket1.async_send(buffer(mutable_char_buffer), send_handler);
    socket1.async_send(buffer(const_char_buffer), send_handler);
    socket1.async_send(null_buffers(), send_handler);
    socket1.async_send(buffer(mutable_char_buffer), in_flags, send_handler);
    socket1.async_send(buffer(const_char_buffer), in_flags, send_handler);
    socket1.async_send(null_buffers(), in_flags, send_handler);

    socket1.receive(buffer(mutable_char_buffer));
    socket1.receive(null_buffers());
    socket1.receive(buffer(mutable_char_buffer), in_flags);
    socket1.receive(null_buffers(), in_flags);
    socket1.receive(buffer(mutable_char_buffer), in_flags, ec);
    socket1.receive(null_buffers(), in_flags, ec);

    socket1.async_receive(buffer(mutable_char_buffer), receive_handler);
    socket1.async_receive(null_buffers(), receive_handler);
    socket1.async_receive(buffer(mutable_char_buffer), in_flags,
        receive_handler);
    socket1.async_receive(null_buffers(), in_flags, receive_handler);

    socket1.write_some(buffer(mutable_char_buffer));
    socket1.write_some(buffer(const_char_buffer));
    socket1.write_some(null_buffers());
    socket1.write_some(buffer(mutable_char_buffer), ec);
    socket1.write_some(buffer(const_char_buffer), ec);
    socket1.write_some(null_buffers(), ec);

    socket1.async_write_some(buffer(mutable_char_buffer), write_some_handler);
    socket1.async_write_some(buffer(const_char_buffer), write_some_handler);
    socket1.async_write_some(null_buffers(), write_some_handler);

    socket1.read_some(buffer(mutable_char_buffer));
    socket1.read_some(buffer(mutable_char_buffer), ec);
    socket1.read_some(null_buffers(), ec);

    socket1.async_read_some(buffer(mutable_char_buffer), read_some_handler);
    socket1.async_read_some(null_buffers(), read_some_handler);
  }
  catch (std::exception&)
  {
  }
#endif // defined(ASIO_HAS_LOCAL_SOCKETS)
}

} // namespace local_stream_protocol_socket_compile

//------------------------------------------------------------------------------

ASIO_TEST_SUITE
(
  "local/stream_protocol",
  ASIO_COMPILE_TEST_CASE(local_stream_protocol_socket_compile::test)
)
